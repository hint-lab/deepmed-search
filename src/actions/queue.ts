'use server';

import { addTask, getTaskStatus } from '@/lib/queue-client';
import { TaskType } from '@/lib/queue-constants';
/**
 * 添加任务到队列
 * @param type 任务类型
 * @param data 任务数据
 * @returns 任务ID
 */
export async function addTaskAction(type: TaskType, data: any) {
    try {
        const jobId = await addTask(type, data);
        return {
            success: true,
            jobId,
        };
    } catch (error) {
        console.error('添加任务失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
        };
    }
}

/**
 * 获取任务状态
 * @param jobId 任务ID
 * @returns 任务状态和结果
 */
export async function getTaskStatusAction(jobId: string) {
    try {
        const status = await getTaskStatus(jobId);
        return {
            success: true,
            ...status,
        };
    } catch (error) {
        console.error('获取任务状态失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
        };
    }
} 