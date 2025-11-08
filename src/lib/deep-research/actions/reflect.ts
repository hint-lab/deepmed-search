/**
 * Reflect Action Handler
 * 
 * 处理反思动作，负责将复杂问题分解为更小的子问题。
 * 
 * 核心功能：
 * 1. 接收 LLM 生成的子问题列表
 * 2. 去重（与历史问题对比，避免重复提问）
 * 3. 限制数量（防止子问题过多）
 * 4. 更新待解决问题列表（gaps）
 * 
 * 这是 Agent 进行问题分解和探索的关键步骤，帮助处理需要多步推理的复杂问题。
 * 
 * @param thisAgent - 研究代理实例
 * @param action - 反思动作对象，包含生成的子问题列表
 * @param currentQuestion - 当前正在分析的问题
 */

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
    
    // ========== 1. 验证和去重子问题 ==========
    // 防御性检查：确保 questionsToAnswer 是有效数组
    if (!action.questionsToAnswer || !Array.isArray(action.questionsToAnswer)) {
        console.error(`[handleReflectAction] Invalid questionsToAnswer for step ${step}`, action);
        action.questionsToAnswer = [];
    }

    // 使用 Jina API 进行语义去重，避免与历史问题重复
    const { unique_queries } = await dedupQueries(action.questionsToAnswer, allQuestions);

    // 限制子问题数量，防止一次生成过多
    const newGapQuestions = chooseK(unique_queries, MAX_REFLECT_PER_STEP);

    // ========== 2. 更新日志和 Agent 状态 ==========
    if (newGapQuestions.length > 0) {
        // 成功生成新的子问题
        diaryContext.push(`
At step ${step}, you took **reflect** and think about the knowledge gaps. You found some sub-questions are important to the question: "${currentQuestion}"
You realize you need to know the answers to the following sub-questions:
${newGapQuestions.map((q: string) => `- ${q}`).join('\n')}

You will now figure out the answers to these sub-questions and see if they can help you find the answer to the original question.
`);
        // 将新子问题添加到待解决列表和历史问题列表
        gaps.push(...newGapQuestions);
        allQuestions.push(...newGapQuestions);
        updateContextHelper(thisAgent, {
            totalStep: totalStep,
            ...action,
            questionsToAnswer: newGapQuestions
        });
    } else {
        // 所有子问题都是重复的，需要换个角度思考
        const safeQuestions = action.questionsToAnswer?.length ? action.questionsToAnswer : ['(未能生成有效子问题)'];
        diaryContext.push(`
At step ${step}, you took **reflect** and think about the knowledge gaps. You tried to break down the question "${currentQuestion}" into sub-questions like this: ${safeQuestions.join(', ')} 
But then you realized you have asked them before or they were duplicates. You decided to to think out of the box or cut from a completely different angle. 
`);
        updateContextHelper(thisAgent, {
            totalStep: totalStep,
            ...action,
            questionsToAnswer: [],
            result: 'You have tried all possible questions and found no useful information. You must think out of the box or different angle!!!'
        });
    }

    // ========== 3. 更新控制标志 ==========
    // 防止连续多次反思，确保 Agent 采取其他行动
    (thisAgent as any).allowReflect = false;
} 