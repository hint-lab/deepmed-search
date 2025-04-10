'use server';

import { QUEUE_NAMES, getQueueStatus, addJob } from '@/lib/bullmq';

// 获取所有队列状态的Server Action
export async function getAllQueueStatus() {
    try {
        // 获取所有队列的状态
        const queueStatuses = await Promise.all(
            Object.values(QUEUE_NAMES).map(async (queueName) => {
                try {
                    const status = await getQueueStatus(queueName);
                    return {
                        name: queueName,
                        ...status
                    };
                } catch (error) {
                    return {
                        name: queueName,
                        error: (error as Error).message,
                        status: 'error'
                    };
                }
            })
        );

        return {
            success: true,
            queues: queueStatuses,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('获取队列状态失败:', error);
        return {
            success: false,
            error: '获取队列状态失败',
            details: (error as Error).message
        };
    }
}

// 添加任务到队列的Server Action
export async function addJobToQueue(queueName: string, data: any) {
    try {
        // 验证请求数据
        if (!queueName || !(queueName in QUEUE_NAMES)) {
            return {
                success: false,
                error: '无效的队列名称'
            };
        }

        if (!data) {
            return {
                success: false,
                error: '缺少任务数据'
            };
        }

        // 添加任务到队列
        const job = await addJob(queueName, data);

        return {
            success: true,
            jobId: job.id,
            message: `任务已添加到队列: ${queueName}`
        };
    } catch (error) {
        console.error('添加任务失败:', error);
        return {
            success: false,
            error: '添加任务失败',
            details: (error as Error).message
        };
    }
} 