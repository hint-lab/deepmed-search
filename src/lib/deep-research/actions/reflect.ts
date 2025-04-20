import { ReflectAction, TrackerContext } from '../types';
import { chooseK } from "../utils/text-tools";
import { dedupQueries } from '../tools/jina-dedup';
import { MAX_REFLECT_PER_STEP } from '../utils/schemas';
import { ResearchAgent } from '../agent';
import { updateContextHelper } from '../agent-helpers';
import { publishThink } from '../tracker-store';
export async function handleReflectAction(thisAgent: ResearchAgent, action: ReflectAction, currentQuestion: string): Promise<void> {
    console.log("Handling Reflect Action for:", currentQuestion);

    const allQuestions = thisAgent.allQuestions as string[];
    const context = thisAgent.context as TrackerContext;
    const diaryContext = thisAgent.diaryContext as string[];
    const step = thisAgent.step as number;
    const totalStep = thisAgent.totalStep as number;
    const gaps = thisAgent.gaps as string[];
    await publishThink(thisAgent.context.taskId, `步骤 ${step}: 开始反思`);
    // 添加防御性检查
    if (!action.questionsToAnswer || !Array.isArray(action.questionsToAnswer)) {
        console.error(`[handleReflectAction] Invalid questionsToAnswer for step ${step}`, action);
        action.questionsToAnswer = []; // 确保是有效数组
    }

    // 使用安全版 dedupQueries
    const { unique_queries } = await dedupQueries(action.questionsToAnswer, allQuestions);

    const newGapQuestions = chooseK(unique_queries, MAX_REFLECT_PER_STEP);

    // 2. Update diary context and agent state
    if (newGapQuestions.length > 0) {
        diaryContext.push(`
At step ${step}, you took **reflect** and think about the knowledge gaps. You found some sub-questions are important to the question: "${currentQuestion}"
You realize you need to know the answers to the following sub-questions:
${newGapQuestions.map((q: string) => `- ${q}`).join('\n')}

You will now figure out the answers to these sub-questions and see if they can help you find the answer to the original question.
`);
        // Update agent state arrays (caller handles this)
        gaps.push(...newGapQuestions);
        allQuestions.push(...newGapQuestions);
        updateContextHelper(thisAgent, {
            totalStep: totalStep,
            ...action, // Spread original action
            questionsToAnswer: newGapQuestions // Store the actual new gaps
        });
    } else {
        // 添加空数组检查
        const safeQuestions = action.questionsToAnswer?.length ? action.questionsToAnswer : ['(未能生成有效子问题)'];
        diaryContext.push(`
At step ${step}, you took **reflect** and think about the knowledge gaps. You tried to break down the question "${currentQuestion}" into sub-questions like this: ${safeQuestions.join(', ')} 
But then you realized you have asked them before or they were duplicates. You decided to to think out of the box or cut from a completely different angle. 
`);
        updateContextHelper(thisAgent, {
            totalStep: totalStep,
            ...action,
            questionsToAnswer: [], // No new gaps added
            result: 'You have tried all possible questions and found no useful information. You must think out of the box or different angle!!!'
        });
    }

    // 3. Update agent control flags (modified in the caller)
    (thisAgent as any).allowReflect = false;
} 