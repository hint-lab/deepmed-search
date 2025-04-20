"use server";

import { getResponse } from '@/lib/deep-research/agent';
import { StepAction, TrackerContext } from '@/lib/deep-research/types'; // 确保导入 TrackerContext
import { ServerActionResponse } from '@/types/actions';

// 定义此 Action 特定的返回数据类型
interface StepDetail {
    step: number;
    question: string;
    action: string;
    think?: string;
    details?: any;
}

type ResearchResponseData = {
    result: StepAction;
    logs?: string[];
    stepDetails?: StepDetail[];
    visitedURLs?: string[];
    readURLs?: string[];
    allURLs?: string[];
    // 可选：添加 context 中的部分信息，例如 token 统计
    tokenUsage?: TrackerContext['tokenTracker']['getTotalUsage'] extends () => infer R ? R : never;
};

/**
 * 开始深度研究任务
 * @param question 研究问题
 */
export async function startResearchAction(
    question: string
): Promise<ServerActionResponse<ResearchResponseData>> { // 使用特定类型
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
        return {
            success: false,
            error: '研究问题不能为空'
        };
    }

    console.log(`开始研究: "${question}"`);
    const logs: string[] = []; // 假设 getResponse 会填充这个
    const stepDetails: StepDetail[] = []; // 假设 getResponse 会填充这个

    try {
        const { result, context, visitedURLs, readURLs, allURLs } = await getResponse(
            question,
            100000, // 示例 tokenBudget
            2,      // 示例 maxBadAttempts
            undefined, // 初始 context
            undefined, // 初始 messages
            undefined, // numReturnedURLs (使用默认值)
            undefined, // noDirectAnswer (使用默认值)
            [], // boostHostnames
            [], // badHostnames
            [], // onlyHostnames
            undefined, // maxRef
            undefined, // minRelScore
            // 传递 logCollector 和 stepDetailsCollector (如果 getResponse 支持)
            // logs, 
            // stepDetails 
        );

        console.log("研究完成，结果:", result);
        console.log("访问过的URLs:", visitedURLs);
        console.log("成功读取的URLs:", readURLs);
        console.log("所有相关URLs:", allURLs);
        console.log("Token 使用情况:", context?.tokenTracker?.getTotalUsage());

        return {
            success: true,
            data: {
                result,
                // logs, // 如果 getResponse 填充了 logs
                // stepDetails, // 如果 getResponse 填充了 stepDetails
                visitedURLs,
                readURLs,
                allURLs,
                tokenUsage: context?.tokenTracker?.getTotalUsage()
            }
        };
    } catch (error: any) {
        console.error('研究任务失败:', error);
        return {
            success: false,
            error: error.message || '研究任务执行失败'
        };
    }
}