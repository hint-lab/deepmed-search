/**
 * Answer Action Handler
 * 
 * 处理生成答案的动作，包括：
 * 1. 对答案进行多维度评估（definitive, freshness, plurality, completeness, strict）
 * 2. 区分主问题和子问题的处理逻辑
 * 3. 评估失败时进行错误分析和反思
 * 4. 管理评估重试次数和改进计划
 * 
 * @param thisAgent - 研究代理实例
 * @param action - 答案动作对象，包含生成的答案内容
 * @param currentQuestion - 当前正在回答的问题
 * @returns Promise<boolean> - 返回 true 表示应该中断主循环（找到最终答案或无重试次数）
 */

import {
    AnswerAction, EvaluationResponse, TrackerContext, KnowledgeItem
} from '../types';
import { evaluateAnswer } from '../tools/evaluator';
import { analyzeSteps } from '../tools/error-analyzer';
import { Schemas } from "../utils/schemas";
import { ResearchAgent } from '../agent';
import { updateContextHelper } from '../agent-helpers';
import { formatDateBasedOnType } from "../utils/date-tools";
import { publishThink } from '../tracker-store';


export async function handleAnswerAction(thisAgent: ResearchAgent, action: AnswerAction, currentQuestion: string): Promise<boolean> {
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
    await publishThink(thisAgent.context.taskId, `步骤 ${totalStep}: 开始回答`);
    
    // ========== 1. 检查是否为简单问题（第一步可直接回答）==========
    if (totalStep === 1 && !options.noDirectAnswer) {
        console.log("Trivial question or direct answer allowed on first step.");
        action.isFinal = true;
        (thisAgent as any).trivialQuestion = true; // Modify agent state
        updateContextHelper(thisAgent, { totalStep: totalStep, question: currentQuestion, ...action });
        return true; // Break the loop
    }

    // ========== 2. 评估答案质量 ==========
    // 初始化评估结果，默认通过
    let evaluation: EvaluationResponse = {
        pass: true,
        think: 'Evaluation skipped or passed by default.',
        type: 'strict',
        improvement_plan: ''
    };
    const currentEvalMetrics = evaluationMetrics[currentQuestion];

    // 如果有评估指标，则进行评估
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

    // ========== 3. 处理评估结果 ==========
    if (currentQuestion.trim() === question) {
        // ---------- 3.1 处理主问题的评估结果 ----------
        if (evaluation.pass) {
            // 主问题答案通过评估，任务完成
            diaryContext.push(`
At step ${thisAgent.step}, you took **answer** action and finally found the answer to the original question:
Original question: ${currentQuestion}
Your answer: ${action.answer}
The evaluator thinks your answer is good because: ${evaluation.think}
Your journey ends here. Congratulations! 🎉
`);
            action.isFinal = true;
            updateContextHelper(thisAgent, { totalStep: totalStep, question: currentQuestion, ...action });
            return true; // 中断循环 - 找到最终答案
        } else {
            // 主问题答案未通过评估，需要改进
            diaryContext.push(`
At step ${thisAgent.step}, you took **answer** action but evaluator thinks it is not a good answer:
Original question: ${currentQuestion}
Your answer: ${action.answer}
The evaluator thinks your answer is bad because: ${evaluation.think}
`);
            await publishThink(thisAgent.context.taskId, `步骤 ${totalStep}: 主问题答案评估失败`);
            
            // 减少失败类型的评估重试次数
            if (currentEvalMetrics) {
                evaluationMetrics[currentQuestion] = currentEvalMetrics.map(e => {
                    if (e.type === evaluation.type) {
                        e.numEvalsRequired--;
                    }
                    return e;
                }).filter(e => e.numEvalsRequired > 0);
            }

            // 如果是严格评估且有改进计划，添加到改进计划列表
            if (evaluation.type === 'strict' && evaluation.improvement_plan) {
                finalAnswerPIP.push(evaluation.improvement_plan);
            }

            // 检查是否还有重试机会
            if (!evaluationMetrics[currentQuestion] || evaluationMetrics[currentQuestion].length === 0) {
                console.warn(`No more evaluation attempts left for the main question: ${currentQuestion}. Returning current answer.`);
                action.isFinal = false;
                (thisAgent as any).thisStep = action;
                updateContextHelper(thisAgent, { totalStep: totalStep, question: currentQuestion, ...action });
                return true; // 中断循环 - 无更多重试次数
            }

            // 分析步骤并添加反思到知识库
            try {
                const errorAnalysis = await analyzeSteps(diaryContext, context, SchemaGen);
                allKnowledge.push({
                    question: `Why is the following answer bad for the question? Please reflect\n<question>${currentQuestion}</question>\n<answer>${action.answer}</answer>`,
                    answer: `${evaluation.think}\n\n${errorAnalysis.recap}\n\n${errorAnalysis.blame}\n\n${errorAnalysis.improvement}`,
                    type: 'qa',
                });
            } catch (analysisError) {
                console.error("Error during step analysis after failed evaluation:", analysisError);
                // 如果分析失败，添加简单的反思
                allKnowledge.push({
                    question: `Reflection on why the answer failed evaluation for question: ${currentQuestion}`,
                    answer: `The answer was evaluated as needing improvement for reason: ${evaluation.think}. Step analysis failed.`,
                    type: 'qa'
                });
            }
            
            // 重置日志和步骤计数器，准备下一轮反思
            (thisAgent as any).diaryContext = [];
            (thisAgent as any).step = 0;
            (thisAgent as any).allowAnswer = false;
            updateContextHelper(thisAgent, { totalStep: totalStep, question: currentQuestion, ...action, evaluation });
        }
    } else {
        // ---------- 3.2 处理子问题的评估结果 ----------
        if (evaluation.pass) {
            // 子问题答案通过评估，添加到知识库
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

            // 从待解决问题列表中移除已回答的子问题
            const gapIndex = gaps.indexOf(currentQuestion);
            if (gapIndex > -1) {
                gaps.splice(gapIndex, 1);
            }
            updateContextHelper(thisAgent, { totalStep: totalStep, question: currentQuestion, ...action, evaluation });
        } else {
            // 子问题答案未通过评估，不添加到知识库
            diaryContext.push(`
                At step ${thisAgent.step}, you took **answer** action for the sub-question: ${currentQuestion}.
                Your answer: ${action.answer}
                However, the evaluator thinks your answer is bad because: ${evaluation.think}
                This answer will not be added to the knowledge base.`);
            updateContextHelper(thisAgent, { totalStep: totalStep, question: currentQuestion, ...action, evaluation });
        }
    }

    return false; // 继续循环，除非上面明确中断
}
