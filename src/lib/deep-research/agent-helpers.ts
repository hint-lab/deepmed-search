import { CoreMessage } from 'ai';
import { ZodObject } from 'zod';
import {
    StepAction, AnswerAction, ReflectAction, SearchAction, VisitAction, CodingAction,
    KnowledgeItem, TrackerContext, SearchSnippet, BoostedSearchSnippet, WebContent,
    Reference, EvaluationResponse
} from './types';
import {
    normalizeUrl, getLastModified, rankURLs, filterURLs, fixBadURLMdLinks
} from "./utils/url-tools";
import {
    buildMdFromAnswer, convertHtmlTablesToMd, fixCodeBlockIndentation,
    repairMarkdownFinal, repairMarkdownFootnotesOuter
} from "./utils/text-tools";
import { repairUnknownChars } from "./tools/broken-ch-fixer";
import { reviseAnswer } from "./tools/md-fixer";
import { buildReferences } from "./tools/build-ref";
import { evaluateQuestion } from './tools/evaluator';
import { getPrompt } from './utils/prompt';
import { composeMsgs } from './utils/message';
import { ObjectGeneratorSafe } from "./utils/safe-generator";
import { Schemas } from "./utils/schemas";
import { ResearchAgent } from './agent';


// Updated signature to accept ResearchAgent instance (or necessary properties)
export async function updateReferencesHelper(thisAgent: ResearchAgent, thisStep: AnswerAction) {
    const allURLs = (thisAgent as any).allURLs as Record<string, SearchSnippet>; // Access private member via cast
    thisStep.references = thisStep.references
        ?.filter(ref => ref?.url)
        .map(ref => {
            const normalizedUrl = normalizeUrl(ref.url);
            if (!normalizedUrl) return null;

            return {
                ...ref,
                exactQuote: (ref?.exactQuote ||
                    allURLs[normalizedUrl]?.description ||
                    allURLs[normalizedUrl]?.title || '')
                    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
                    .replace(/\s+/g, ' '),
                title: allURLs[normalizedUrl]?.title || '',
                url: normalizedUrl,
                dateTime: ref?.dateTime || allURLs[normalizedUrl]?.date || '',
            };
        })
        .filter(Boolean) as Reference[];

    await Promise.all((thisStep.references || []).filter(ref => !ref.dateTime)
        .map(async ref => {
            ref.dateTime = await getLastModified(ref.url) || '';
        }));

    console.log('Updated References (Helper):', thisStep.references);
}

// Updated signature to accept ResearchAgent instance (or necessary properties)
export function initializeEvaluationMetricsHelper(thisAgent: ResearchAgent, currentQuestion: string): void {
    const totalStep = (thisAgent as any).totalStep as number;
    const question = (thisAgent as any).question as string;
    const evaluationMetrics = (thisAgent as any).evaluationMetrics as Record<string, any[]>;
    const options = (thisAgent as any).options as any; // Assuming ResearchAgentOptions type is available
    const context = (thisAgent as any).context as TrackerContext;
    const SchemaGen = (thisAgent as any).SchemaGen as Schemas;

    if (currentQuestion.trim() === question && totalStep === 1) {
        evaluateQuestion(currentQuestion, context, SchemaGen)
            .then(evalTypes => {
                evaluationMetrics[currentQuestion] = evalTypes.map(e => ({
                    type: e,
                    numEvalsRequired: options.maxBadAttempts
                }));
                evaluationMetrics[currentQuestion].push({ type: 'strict', numEvalsRequired: options.maxBadAttempts });
            })
            .catch(err => console.error(`Failed to evaluate question ${currentQuestion}:`, err));
    } else if (currentQuestion.trim() !== question && !evaluationMetrics[currentQuestion]) {
        evaluationMetrics[currentQuestion] = [];
    }
}

// Updated signature to accept ResearchAgent instance (or necessary properties)
export async function determineNextActionHelper(thisAgent: ResearchAgent, currentQuestion: string): Promise<StepAction | null> {
    const diaryContext = (thisAgent as any).diaryContext as string[];
    const allQuestions = (thisAgent as any).allQuestions as string[];
    const allKeywords = (thisAgent as any).allKeywords as string[];
    const allowReflect = (thisAgent as any).allowReflect as boolean;
    const allowAnswer = (thisAgent as any).allowAnswer as boolean;
    const allowRead = (thisAgent as any).allowRead as boolean;
    const allowSearch = (thisAgent as any).allowSearch as boolean;
    const allowCoding = (thisAgent as any).allowCoding as boolean;
    const allKnowledge = (thisAgent as any).allKnowledge as KnowledgeItem[];
    const weightedURLs = (thisAgent as any).weightedURLs as BoostedSearchSnippet[];
    const question = (thisAgent as any).question as string;
    const finalAnswerPIP = (thisAgent as any).finalAnswerPIP as string[];
    const SchemaGen = (thisAgent as any).SchemaGen as Schemas;
    const messages = (thisAgent as any).messages as CoreMessage[];
    const generator = (thisAgent as any).generator as ObjectGeneratorSafe;
    const msgWithKnowledge = (thisAgent as any).msgWithKnowledge as CoreMessage[]; // This needs assignment

    const { system, urlList } = getPrompt(
        diaryContext,
        allQuestions,
        allKeywords,
        allowReflect,
        allowAnswer,
        allowRead,
        allowSearch,
        allowCoding,
        allKnowledge,
        weightedURLs,
        false, // Not final step
    );
    const schema = SchemaGen.getAgentSchema(allowReflect, allowRead, allowAnswer, allowSearch, allowCoding, currentQuestion);
    // Assign msgWithKnowledge before use
    (thisAgent as any).msgWithKnowledge = composeMsgs(messages, allKnowledge, currentQuestion, currentQuestion === question ? finalAnswerPIP : undefined);

    try {
        const result = await generator.generateObject({
            model: 'agent', // Use appropriate model alias
            schema,
            system,
            messages: (thisAgent as any).msgWithKnowledge, // Use the assigned value
            numRetries: 2,
        });
        
        // 验证返回的结果
        if (!result || !result.object) {
            console.error("LLM returned empty result");
            return null;
        }
        
        const actionType = result.object.action;
        
        // 严格验证 action 字段
        if (!actionType || typeof actionType !== 'string') {
            console.error("Invalid action type returned by LLM:", {
                action: actionType,
                fullObject: result.object
            });
            return null;
        }
        
        // 验证 action 类型是否有效
        const validActions = ['search', 'visit', 'answer', 'reflect', 'coding'];
        if (!validActions.includes(actionType)) {
            console.error(`Unknown action type: ${actionType}. Valid actions: ${validActions.join(', ')}`);
            return null;
        }
        
        const actionPayload = result.object[actionType] || {};
        const stepAction = {
            action: actionType,
            think: result.object.think || '',
            ...actionPayload
        } as StepAction;
        
        console.log("Generated action:", stepAction);
        return stepAction;
    } catch (error) {
        console.error("Error generating next action:", error);
        return null; // Return null on generation failure
    }
}

// Updated signature to accept ResearchAgent instance (or necessary properties)
export function updateContextHelper(thisAgent: ResearchAgent, stepData: any): void {
    // Push to the agent's context array
    thisAgent.allContext.push(stepData);
    const totalStep = (thisAgent as any).totalStep as number;
    console.log("Context updated (Helper) for step: ", stepData.totalStep || totalStep);
}

// Updated signature to accept ResearchAgent instance (or necessary properties)
export async function generateFinalAnswerHelper(thisAgent: ResearchAgent): Promise<StepAction> {
    console.log('Entering Beast mode!!! (Implementation Pending - Helper)');
    // TODO: Implement Beast Mode logic here, similar to how it was in the original class
    // This will likely need access to many agent properties via `thisAgent`
    return { action: 'answer', answer: 'Beast Mode Placeholder (Helper)', references: [], think: 'Generating final answer in beast mode', isFinal: true }; // Placeholder
}

// Updated signature to accept ResearchAgent instance (or necessary properties)
export async function processFinalAnswerHelper(thisAgent: ResearchAgent, answerAction: AnswerAction): Promise<void> {
    console.log('Processing Final Answer (Helper)');
    const trivialQuestion = (thisAgent as any).trivialQuestion as boolean;
    const allKnowledge = (thisAgent as any).allKnowledge as KnowledgeItem[];
    const context = (thisAgent as any).context as TrackerContext;
    const SchemaGen = (thisAgent as any).SchemaGen as Schemas;
    const allURLs = (thisAgent as any).allURLs as Record<string, SearchSnippet>;
    const allWebContents = (thisAgent as any).allWebContents as Record<string, WebContent>;
    const options = (thisAgent as any).options as any; // Assuming ResearchAgentOptions type

    if (trivialQuestion) {
        answerAction.mdAnswer = answerAction.mdAnswer || convertHtmlTablesToMd(
            fixCodeBlockIndentation(
                buildMdFromAnswer(answerAction))
        );
        return;
    }

    answerAction.answer = answerAction.answer || "I couldn't find a definitive answer, but here's what I gathered.";

    try {
        const repairedAnswer = repairMarkdownFinal(
            convertHtmlTablesToMd(
                fixBadURLMdLinks(
                    fixCodeBlockIndentation(
                        repairMarkdownFootnotesOuter(
                            await repairUnknownChars(
                                await reviseAnswer(
                                    answerAction.answer,
                                    allKnowledge,
                                    context,
                                    SchemaGen),
                                context))
                    ),
                    allURLs)));
        answerAction.answer = repairedAnswer;
    } catch (repairError) {
        console.error("Error repairing final answer markdown:", repairError);
    }

    try {
        const { answer, references } = await buildReferences(
            answerAction.answer,
            allWebContents,
            context,
            SchemaGen,
            80, // Threshold?
            options.maxRef,
            options.minRelScore
        );
        answerAction.answer = answer;
        answerAction.references = references;
        // Call the helper for updating references, passing the agent instance
        await updateReferencesHelper(thisAgent, answerAction);
        answerAction.mdAnswer = repairMarkdownFootnotesOuter(buildMdFromAnswer(answerAction));
    } catch (refError) {
        console.error("Error building or updating references:", refError);
        answerAction.references = answerAction.references || [];
        try {
            answerAction.mdAnswer = repairMarkdownFootnotesOuter(buildMdFromAnswer(answerAction));
        } catch (mdBuildError) {
            console.error("Error building final MdAnswer after reference failure:", mdBuildError);
            answerAction.mdAnswer = answerAction.answer;
        }
    }
    console.log("Final Processed Answer (Helper):", answerAction)
}

// Updated signature to accept ResearchAgent instance (or necessary properties)
export async function rankURLsHelper(thisAgent: ResearchAgent): Promise<BoostedSearchSnippet[]> {
    const allURLs = (thisAgent as any).allURLs as Record<string, SearchSnippet>;
    const visitedURLs = (thisAgent as any).visitedURLs as string[];
    const options = (thisAgent as any).options as any; // Assuming ResearchAgentOptions type
    const gaps = (thisAgent as any).gaps as string[];
    const totalStep = (thisAgent as any).totalStep as number;
    const question = (thisAgent as any).question as string;
    const context = (thisAgent as any).context as TrackerContext;

    return await rankURLs(
        filterURLs(allURLs, visitedURLs, options.badHostnames, options.onlyHostnames),
        {
            question: gaps[totalStep % gaps.length] || question,
            boostHostnames: options.boostHostnames
        }, context);
}
