"use server";

import { v4 as uuidv4 } from 'uuid'; // 需要安装 uuid: npm install uuid @types/uuid
import { ServerActionResponse } from '@/types/actions';
import { addTask } from '@/lib/bullmq/queue-manager'; // Import only addTask
import { TaskType } from '@/lib/bullmq/types'; // Import TaskType directly
import { storeTaskPlaceholder, removeTaskPlaceholder, publishError, checkTaskActive } from '@/lib/deep-research/tracker-store';
// 假设的研究任务处理函数，请确保路径正确
import { processResearchTask } from '@/lib/deep-research'; // Placeholder import
import logger from '@/utils/logger';
// 定义前端期望的返回类型，现在主要是 taskId
interface ResearchStartResponseData {
    taskId: string;
}

// 定义后台任务需要的数据结构 (示例)
export interface ResearchJobPayload {
    taskId: string;
    question: string;
    tokenBudget: number;
    // ... 其他 getResponse 需要的参数
}

/**
 * 启动后台深度研究任务
 * @param question 研究问题
 * @param useQueue 是否将任务放入队列，默认为 true。如果为 false，则直接调用处理逻辑。
 */
export async function startResearchAction(
    question: string,
    useQueue: boolean = false // 新增参数，默认为 false
): Promise<ServerActionResponse<ResearchStartResponseData>> {
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
        return {
            success: false,
            error: '研究问题不能为空'
        };
    }

    const taskId = uuidv4(); // 1. 生成唯一 Task ID
    logger.info(`[Task ${taskId}] 接收到研究请求: "${question}"`);

    try {
        // 2. Store task placeholder in Redis
        await storeTaskPlaceholder(taskId); // Using default TTL
        logger.info(`[Task ${taskId}] Task placeholder stored in Redis`);

        // 3. 触发后台任务 (将实际工作放入队列)
        const jobPayload: ResearchJobPayload = {
            taskId,
            question,
            tokenBudget: 2000000, // 示例参数，应根据需要调整
            // ... 传递其他需要的参数
        };

        // === 根据 useQueue 参数决定执行方式 ===
        if (useQueue) {
            logger.info(`[Task ${taskId}] 添加任务到队列 ${TaskType.DEEP_RESEARCH}`);
            await addTask<ResearchJobPayload>(TaskType.DEEP_RESEARCH, jobPayload);
            logger.info(`[Task ${taskId}] 任务已成功添加到队列`);
        } else {
            logger.info(`[Task ${taskId}] 直接调用研究任务处理逻辑`);
            // 直接调用，但不阻塞返回。让它在后台运行。
            processResearchTask(taskId, jobPayload.question, jobPayload.tokenBudget).catch((err: unknown) => {
                // Log the error
                logger.error(`[Task ${taskId}] 直接调用 processResearchTask 失败:`, err);

                // --- Publish error instead of removing placeholder --- START
                const errorMessage = err instanceof Error ? err.message : 'Agent execution failed';
                publishError(taskId, errorMessage).catch(pubErr => {
                    logger.error(`[Task ${taskId}] Failed to publish error event to Redis after agent failure:`, pubErr);
                });
                // --- Publish error instead of removing placeholder --- END

                // Optional: Decide if removeTaskPlaceholder is *still* needed in some cases.
                // For now, we rely on the agent/worker or TTL to handle cleanup.
                /*
                removeTaskPlaceholder(taskId).catch((removeErr: unknown) => {
                    console.error(`[Task ${taskId}] 移除 placeholder 失败 (在直接调用错误后):`, removeErr);
                });
                */
            });
            logger.info(`[Task ${taskId}] 研究任务处理逻辑已触发 (非队列)`);
        }
        // ===================================

        // 4. 立即返回 taskId 给前端 (无论哪种方式)
        logger.info(`[Task ${taskId}] 返回 taskId 给前端`);

        // 增加延迟时间，确保任务状态初始化完成
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 检查任务状态
        const isActive = await checkTaskActive(taskId);
        if (!isActive) {
            logger.error(`[Task ${taskId}] 任务状态检查失败：任务未激活`);
            return {
                success: false,
                error: '任务初始化失败，请重试'
            };
        }

        return {
            success: true,
            data: { taskId }
        };

    } catch (error: any) {
        console.error(`[Task ${taskId}] 启动研究任务失败:`, error);
        // Attempt to remove placeholder if task setup failed *before* agent call
        // Check if taskId exists before trying to remove
        if (taskId) {
            await removeTaskPlaceholder(taskId);
        }
        return {
            success: false,
            error: error.message || '启动研究任务失败'
        };
    }
}

