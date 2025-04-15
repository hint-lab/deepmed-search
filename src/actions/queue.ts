"use server";

import { checkQueueHealth, documentConvertProcessQueue, addJob, getJobStatus } from '@/lib/bullmq/queue-manager';
import { QUEUE_NAMES } from '@/lib/bullmq/queue-names';
import { ServerActionResponse } from '@/types/actions';

/**
 * 检查队列健康状态
 */
export async function checkQueueHealthAction() {
    return await checkQueueHealth();
}

/**
 * 获取队列名称
 */
export async function getQueueName() {
    return QUEUE_NAMES;
}

/**
 * 添加任务到队列
 */
export async function addTaskAction(
    queueName: string,
    data: any
): Promise<ServerActionResponse<{ jobId: string }>> {
    try {
        const job = await addJob(documentConvertProcessQueue, data);
        return {
            success: true,
            data: {
                jobId: job.id || ''
            }
        };
    } catch (error: any) {
        console.error('添加任务失败:', error);
        return {
            success: false,
            error: error.message || '添加任务失败'
        };
    }
}

/**
 * 获取任务状态
 */
export async function getTaskStatusAction(
    jobId: string
): Promise<ServerActionResponse<any>> {
    try {
        const status = await getJobStatus(documentConvertProcessQueue, jobId);
        if (!status) {
            return {
                success: false,
                error: '任务不存在'
            };
        }
        return {
            success: true,
            data: status
        };
    } catch (error: any) {
        console.error('获取任务状态失败:', error);
        return {
            success: false,
            error: error.message || '获取任务状态失败'
        };
    }
}