import {
    AnswerAction, EvaluationResponse, TrackerContext, KnowledgeItem
} from '../types';
import { evaluateAnswer } from '../tools/evaluator';
import { analyzeSteps } from '../tools/error-analyzer';
import { Schemas } from "../utils/schemas";
import { ResearchAgent } from '../agent';
import { updateContextHelper } from '../agent-helpers';
import { formatDateBasedOnType } from "../utils/date-tools";

export async function handleAnswerAction(thisAgent: ResearchAgent, action: AnswerAction, currentQuestion: string): Promise<boolean> { // Returns true if loop should break
    console.log("Handling Answer Action for:", currentQuestion);

    const totalStep = thisAgent.totalStep as number;
    const options = thisAgent.options;
    const evaluationMetrics = thisAgent.evaluationMetrics as Record<string, any[]>;
    const context = thisAgent.context as TrackerContext;
    const SchemaGen = thisAgent.SchemaGen as Schemas;
    const allKnowledge = thisAgent.allKnowledge as KnowledgeItem[];
    const question = thisAgent.question as string;
    const diaryContext = thisAgent.diaryContext as string[];
    const finalAnswerPIP = thisAgent.finalAnswerPIP as string[];
    const gaps = thisAgent.gaps as string[];

    // 1. Check for trivial question (first step, direct answer allowed)
    if (totalStep === 1 && !options.noDirectAnswer) {
        console.log("Trivial question or direct answer allowed on first step.");
        action.isFinal = true;
        (thisAgent as any).trivialQuestion = true; // Modify agent state
        updateContextHelper(thisAgent, { totalStep: totalStep, question: currentQuestion, ...action });
        return true; // Break the loop
    }

    // 2. Evaluate answer
    let evaluation: EvaluationResponse = {
        pass: true,
        think: 'Evaluation skipped or passed by default.',
        type: 'strict',
        improvement_plan: ''
    };
    const currentEvalMetrics = evaluationMetrics[currentQuestion];

    if (currentEvalMetrics && currentEvalMetrics.length > 0) {
        console.log(`Evaluating answer for: ${currentQuestion} with metrics:`, currentEvalMetrics.map(e => e.type));
        context.actionTracker.trackThink('eval_first', SchemaGen.languageCode);
        try {
            evaluation = await evaluateAnswer(
                currentQuestion,
                action,
                currentEvalMetrics.filter(e => e.numEvalsRequired > 0).map(e => e.type),
                context,
                allKnowledge,
                SchemaGen
            ) || evaluation;
        } catch (evalError) {
            console.error(`Error during answer evaluation for ${currentQuestion}:`, evalError);
            evaluation = { pass: false, think: `Evaluation failed with error: ${evalError instanceof Error ? evalError.message : String(evalError)}`, type: 'strict' };
        }
    } else {
        console.log(`No evaluation metrics found for: ${currentQuestion}, skipping evaluation.`);
    }

    // 3. Handle evaluation results
    if (currentQuestion.trim() === question) {
        // Handling evaluation for the MAIN question
        (thisAgent as any).allowCoding = false; // Modify agent state

        if (evaluation.pass) {
            diaryContext.push(`
At step ${thisAgent.step}, you took **answer** action and finally found the answer to the original question:
Original question: ${currentQuestion}
Your answer: ${action.answer}
The evaluator thinks your answer is good because: ${evaluation.think}
Your journey ends here. Congratulations! 🎉
`);
            action.isFinal = true;
            updateContextHelper(thisAgent, { totalStep: totalStep, question: currentQuestion, ...action }); // Update context before breaking
            return true; // Break loop - Final Answer Found
        } else {
            // Main question answer failed evaluation
            diaryContext.push(`
At step ${thisAgent.step}, you took **answer** action but evaluator thinks it is not a good answer:
Original question: ${currentQuestion}
Your answer: ${action.answer}
The evaluator thinks your answer is bad because: ${evaluation.think}
`);

            // Decrement eval attempts for the failed type
            if (currentEvalMetrics) {
                evaluationMetrics[currentQuestion] = currentEvalMetrics.map(e => {
                    if (e.type === evaluation.type) {
                        e.numEvalsRequired--;
                    }
                    return e;
                }).filter(e => e.numEvalsRequired > 0);
            }

            // Add improvement plan if applicable (strict eval)
            if (evaluation.type === 'strict' && evaluation.improvement_plan) {
                finalAnswerPIP.push(evaluation.improvement_plan);
            }

            // If no more retries allowed for this question based on metrics
            if (!evaluationMetrics[currentQuestion] || evaluationMetrics[currentQuestion].length === 0) {
                console.warn(`No more evaluation attempts left for the main question: ${currentQuestion}. Returning current answer.`);
                action.isFinal = false; // Mark as not final, but break loop
                (thisAgent as any).thisStep = action; // Update thisStep before breaking
                updateContextHelper(thisAgent, { totalStep: totalStep, question: currentQuestion, ...action }); // Update context before breaking
                return true; // Break loop - No more retries
            }

            // Analyze steps and add reflection to knowledge
            try {
                const errorAnalysis = await analyzeSteps(diaryContext, context, SchemaGen);
                allKnowledge.push({
                    question: `Why is the following answer bad for the question? Please reflect\n<question>${currentQuestion}</question>\n<answer>${action.answer}</answer>`,
                    answer: `${evaluation.think}\n\n${errorAnalysis.recap}\n\n${errorAnalysis.blame}\n\n${errorAnalysis.improvement}`,
                    type: 'qa',
                });
            } catch (analysisError) {
                console.error("Error during step analysis after failed evaluation:", analysisError);
                allKnowledge.push({ // Add simpler reflection on error
                    question: `Reflection on why the answer failed evaluation for question: ${currentQuestion}`,
                    answer: `The answer was evaluated as needing improvement for reason: ${evaluation.think}. Step analysis failed.`,
                    type: 'qa'
                });
            }

            // Reset diary and step counter for reflection cycle (modified in the caller)
            (thisAgent as any).diaryContext = [];
            (thisAgent as any).step = 0;
            (thisAgent as any).allowAnswer = false; // Modify agent state
            updateContextHelper(thisAgent, { totalStep: totalStep, question: currentQuestion, ...action, evaluation }); // Update context with failure info
        }
    } else {
        // Handling evaluation for a SUB-question
        if (evaluation.pass) {
            diaryContext.push(`
At step ${thisAgent.step}, you took **answer** action. You found a good answer to the sub-question:
Sub-question: ${currentQuestion}
Your answer: ${action.answer}
The evaluator thinks your answer is good because: ${evaluation.think}
Adding this to knowledge.`);
            allKnowledge.push({
                question: currentQuestion,
                answer: action.answer,
                type: 'qa',
                updated: formatDateBasedOnType(new Date(), 'full')
            });
            // Remove the answered sub-question from gaps (modified in the caller)
            const gapIndex = gaps.indexOf(currentQuestion);
            if (gapIndex > -1) {
                gaps.splice(gapIndex, 1);
            }
            updateContextHelper(thisAgent, { totalStep: totalStep, question: currentQuestion, ...action, evaluation }); // Update context with success info
        } else {
            diaryContext.push(`
At step ${thisAgent.step}, you took **answer** action for the sub-question: ${currentQuestion}.
Your answer: ${action.answer}
However, the evaluator thinks your answer is bad because: ${evaluation.think}
This answer will not be added to the knowledge base.`);
            updateContextHelper(thisAgent, { totalStep: totalStep, question: currentQuestion, ...action, evaluation }); // Update context with failure info
        }
    }

    return false; // Continue the loop unless explicitly broken above
}
