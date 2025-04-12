"use server"

import { executeWithRetry, limit, sendRequest } from './client';
import { DEFAULT_CONFIG, QUEUE_NAMES, TaskType } from './config';
import { QueueHealthStatus, TaskParams } from './types';

/**
 * 检查队列服务是否可用
 */
export async function isQueueServiceAvailable(): Promise<boolean> {
    try {
        await executeWithRetry(async () => {
            await sendRequest('/health');
        });
        return true;
    } catch (error) {
        console.error(`  ❌ 检查队列服务可用性失败:`, error);
        return false;
    }
}

/**
 * 检查队列是否存在
 */
export async function queueExists(queueName: string): Promise<boolean> {
    try {
        const healthData = await executeWithRetry(async () => {
            return await sendRequest<{ queues: Record<string, any> }>('/health');
        });

        return healthData.queues && healthData.queues[queueName] !== undefined;
    } catch (error) {
        console.error(`  ❌ 检查队列 ${queueName} 失败:`, error);
        return false;
    }
}

/**
 * 创建队列
 */
export async function createQueue(queueName: string): Promise<boolean> {
    try {
        // 队列服务不需要显式创建队列，队列会在添加任务时自动创建
        // 这里我们添加一个空任务来确保队列存在
        await executeWithRetry(async () => {
            await sendRequest('/tasks', 'POST', {
                type: queueName,
                data: { action: 'init' }
            });
        });

        console.log(`  ✅ 队列 ${queueName} 创建成功`);
        return true;
    } catch (error) {
        // 如果是 404 错误，可能是队列服务未启动或 API 路径不正确
        if (error instanceof Error && error.message.includes('404')) {
            console.warn(`  ⚠️ 队列服务可能未启动或 API 路径不正确`);
            return false;
        }

        console.error(`  ❌ 创建队列 ${queueName} 失败:`, error);
        return false;
    }
}

/**
 * 检查队列系统健康状态
 */
export async function checkQueueHealth(): Promise<QueueHealthStatus> {
    const healthStatus: QueueHealthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        queues: {},
        redis: {
            status: 'disconnected',
            details: '',
            error: null
        },
        performance: {
            totalJobs: 0,
            activeJobs: 0,
            completedJobs: 0,
            failedJobs: 0
        }
    };

    try {
        // 获取所有队列的健康状态
        const healthData = await executeWithRetry(async () => {
            return await sendRequest<any>('/health');
        });

        // 更新整体健康状态
        healthStatus.status = healthData.status === 'healthy' ? 'healthy' : 'unhealthy';

        // 更新 Redis 连接状态
        healthStatus.redis.status = healthData.redis && healthData.redis.status === 'connected' ? 'connected' : 'disconnected';
        if (healthData.redis && healthData.redis.details) {
            healthStatus.redis.details = healthData.redis.details;
        }
        if (healthData.redis && healthData.redis.error) {
            healthStatus.redis.error = healthData.redis.error;
        }

        // 更新每个队列的状态
        if (healthData.queues) {
            for (const [queueName, queueData] of Object.entries(healthData.queues)) {
                const queueInfo = queueData as any;

                // 更新性能统计
                if (queueInfo.details) {
                    const jobCounts = queueInfo.details;
                    healthStatus.performance.totalJobs +=
                        (jobCounts.waiting || 0) +
                        (jobCounts.active || 0) +
                        (jobCounts.completed || 0) +
                        (jobCounts.failed || 0);
                    healthStatus.performance.activeJobs += jobCounts.active || 0;
                    healthStatus.performance.completedJobs += jobCounts.completed || 0;
                    healthStatus.performance.failedJobs += jobCounts.failed || 0;

                    // 检查队列健康状态
                    healthStatus.queues[queueName] = {
                        status: queueInfo.status === 'healthy' ? 'healthy' : 'unhealthy',
                        details: {
                            jobCounts,
                            isPaused: false, // 队列服务没有提供这个信息
                            workers: [], // 队列服务没有提供这个信息
                            rateLimit: null // 队列服务没有提供这个信息
                        }
                    };
                }
            }
        }

        return healthStatus;
    } catch (error) {
        console.error('队列健康检查失败:', error);
        healthStatus.status = 'unhealthy';
        healthStatus.redis.error = (error as Error).message;
        return healthStatus;
    }
}

/**
 * 添加任务到队列
 */
export async function addTask(type: TaskType, data: any): Promise<string> {
    try {
        const taskParams: TaskParams = {
            type,
            data,
        };

        const result = await limit(() => executeWithRetry(async () => {
            return await sendRequest<{ jobId: string }>('/tasks', 'POST', taskParams);
        }));

        return result.jobId;
    } catch (error) {
        console.error('添加任务失败:', error);
        throw error;
    }
}

/**
 * 获取任务状态
 */
export async function getTaskStatus(jobId: string): Promise<{
    state: string;
    result?: any;
}> {
    try {
        return await limit(() => executeWithRetry(async () => {
            return await sendRequest<{
                state: string;
                result?: any;
            }>(`/tasks/${jobId}`);
        }));
    } catch (error) {
        console.error('获取任务状态失败:', error);
        throw error;
    }
} 