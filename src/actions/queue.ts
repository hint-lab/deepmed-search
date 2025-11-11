"use server";

import { Queue, Job } from 'bullmq';
import { addTask, getJobStatus, checkQueueHealth } from '@/lib/bullmq/queue-manager'; // Server Actions 直接调用队列管理器
import { QUEUE_NAMES } from '@/lib/bullmq/queue-names';
import { ServerActionResponse } from '@/types/actions';
import { TaskType } from '@/lib/bullmq/types';

/**
 * 检查队列健康状态
 * Server Action - 直接调用队列管理器
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
 * Server Action - 直接调用队列管理器
 */
export async function addTaskAction(
    taskType: TaskType,
    payload: any
): Promise<ServerActionResponse<{ jobId: string | null }>> {
    try {
        const jobId = await addTask(taskType, payload);

        return {
            success: true,
            data: {
                jobId: jobId || null
            }
        };
    } catch (error: any) {
        console.error('添加任务失败:', error);
        return {
            success: false,
            error: error.message || '添加任务失败',
            data: { jobId: null }
        };
    }
}

/**
 * 获取任务状态
 * Server Action - 直接调用队列管理器
 */
export async function getTaskStatusAction(
    jobId: string
): Promise<ServerActionResponse<any>> {
    try {
        const status = await getJobStatus(jobId);

        if (!status) {
            return {
                success: false,
                error: '任务不存在或无法获取状态'
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