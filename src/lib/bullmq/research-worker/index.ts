import { ResearchJobPayload } from "@/actions/research";
import { createWorker } from '../queue-manager';
import { TaskType } from '../types';
import { Job } from 'bullmq';
import logger from '@/utils/logger';
import { processResearchTask } from '@/lib/deep-research';

/**
 * Research Worker 处理器
 * 从队列中获取任务并调用实际的研究处理函数
 */
async function processResearchJob(job: Job<ResearchJobPayload>): Promise<void> {
    const { taskId, userId, question, tokenBudget } = job.data;
    logger.info(`[Research Worker] 开始处理任务 ${taskId} (用户 ${userId}): "${question}"`);

    try {
        // 调用实际的研究处理函数
        await processResearchTask(taskId, userId, question, tokenBudget);

        logger.info(`[Research Worker] 任务 ${taskId} 处理完成`);
    } catch (error) {
        logger.error(`[Research Worker] 任务 ${taskId} 处理失败:`, error);
        throw error;
    }
}

// 创建并启动 Research Worker
const researchWorker = createWorker<ResearchJobPayload, void>(
    TaskType.DEEP_RESEARCH,
    processResearchJob
);

logger.info('[Research Worker] Research Worker 已启动');

export default researchWorker; 