"use server"

import pLimit from 'p-limit';
import { DEFAULT_CONFIG, getQueueServiceUrl } from './config';
import { TaskParams, TaskResponse, TaskStatus } from './types';

// 并发限制器
const limit = pLimit(10); // 限制并发请求数

/**
 * 发送请求到队列服务
 * @param endpoint 端点
 * @param method 请求方法
 * @param data 请求数据
 * @returns 响应数据
 */
export async function sendRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    data?: any
): Promise<T> {
    const queueUrl = getQueueServiceUrl();
    const url = `${queueUrl}${endpoint}`;

    const options: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`队列服务响应错误: ${response.statusText}`);
    }

    return response.json();
}

/**
 * 带重试的队列操作执行器
 */
export async function executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries = DEFAULT_CONFIG.healthCheck.maxRetries
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;
            console.warn(`队列操作失败 (尝试 ${attempt}/${maxRetries}):`, error);

            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, DEFAULT_CONFIG.healthCheck.retryDelay));
            }
        }
    }

    throw lastError;
}

/**
 * 添加任务到队列
 */
export async function addTaskToQueue(params: TaskParams): Promise<TaskResponse> {
    return limit(() => executeWithRetry(async () => {
        return await sendRequest<TaskResponse>('/tasks', 'POST', params);
    }));
}

/**
 * 获取任务状态
 */
export async function getTaskStatusFromQueue(jobId: string): Promise<TaskStatus> {
    return limit(() => executeWithRetry(async () => {
        return await sendRequest<TaskStatus>(`/tasks/${jobId}`);
    }));
}

// 导出并发限制器供其他模块使用
export { limit }; 