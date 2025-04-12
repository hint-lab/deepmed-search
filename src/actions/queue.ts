'use server';

import { TaskType, addTask, getTaskStatus, checkQueueHealth } from '@/lib/queue';
/**
 * 添加任务到队列
 * @param type 任务类型
 * @param data 任务数据
 * @returns 任务ID
 */
export async function addTaskAction(type: TaskType, data: any) {
    try {
        console.log('服务器端添加任务:', { type, data });
        const jobId = await addTask(type, data);
        console.log('任务添加成功，任务ID:', jobId);
        return {
            success: true,
            jobId,
        };
    } catch (error) {
        console.error('服务器端添加任务失败:', error);
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

        // 获取队列健康状态
        const healthStatus = await checkQueueHealth();

        return {
            success: true,
            jobId,
            state: status.state,
            result: status.result,
            timestamp: new Date().toISOString(),
            queues: healthStatus.queues,
            redis: healthStatus.redis,
            performance: healthStatus.performance
        };
    } catch (error) {
        console.error('获取任务状态失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
            jobId,
            state: 'error',
            timestamp: new Date().toISOString(),
            queues: {},
            redis: { connected: false, error: error instanceof Error ? error.message : '未知错误' },
            performance: {
                totalJobs: 0,
                activeJobs: 0,
                completedJobs: 0,
                failedJobs: 0
            }
        };
    }
}

/**
 * 检查队列系统健康状态
 * @returns 队列系统健康状态
 */
export async function checkQueueHealthAction() {
    try {
        console.log('服务器端检查队列健康状态');
        const healthStatus = await checkQueueHealth();
        console.log('队列健康状态:', healthStatus);

        // 处理Redis连接状态
        const redisStatus = healthStatus.redis.status === 'connected' ? 'connected' : 'disconnected';
        const redisDetails = healthStatus.redis.details || '';
        const redisError = healthStatus.redis.status === 'connected' ? null : (healthStatus.redis.error || '连接失败');

        return {
            success: true,
            status: healthStatus.status,
            timestamp: healthStatus.timestamp,
            redis: {
                status: redisStatus,
                details: redisDetails,
                error: redisError
            },
            queues: healthStatus.queues,
            performance: healthStatus.performance
        };
    } catch (error) {
        console.error('检查队列健康状态失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            redis: {
                status: 'disconnected',
                details: '',
                error: error instanceof Error ? error.message : '未知错误'
            },
            queues: {},
            performance: {
                totalJobs: 0,
                activeJobs: 0,
                completedJobs: 0,
                failedJobs: 0
            }
        };
    }
} 