'use server';

import { queues, QUEUE_NAMES } from '@/lib/bullmq';

/**
 * 检查队列系统状态
 * 返回详细的诊断信息
 */
export async function checkQueueSystem() {
    try {
        // 检查队列对象是否存在
        const queueExists = !!queues;

        // 检查各个队列是否已创建
        const queueStatus = Object.entries(QUEUE_NAMES).map(([key, queueName]) => {
            const exists = !!queues[queueName];
            return {
                key,
                name: queueName,
                exists,
                connectionInfo: exists ? {
                    // 提取连接信息，但不包含敏感数据
                    host: queues[queueName].opts.connection?.host || 'unknown',
                    port: queues[queueName].opts.connection?.port || 'unknown',
                    // 不要包含密码等敏感信息
                } : null
            };
        });

        // 检查是否所有队列都已创建
        const allQueuesExist = queueStatus.every(q => q.exists);

        return {
            success: true,
            timestamp: new Date().toISOString(),
            queueSystemInitialized: queueExists,
            allQueuesExist,
            queueStatus,
            queueNames: QUEUE_NAMES,
            rawQueues: Object.keys(queues)
        };
    } catch (error) {
        console.error('队列系统诊断失败:', error);
        return {
            success: false,
            timestamp: new Date().toISOString(),
            error: '队列系统诊断失败',
            details: (error as Error).message,
            stack: (error as Error).stack
        };
    }
}

/**
 * 重新初始化队列系统
 * 用于手动修复队列系统问题
 */
export async function reinitializeQueueSystem() {
    try {
        const { initQueueSystem } = await import('@/lib/queue-init');
        await initQueueSystem();

        // 再次检查队列状态
        const status = await checkQueueSystem();

        return {
            success: true,
            message: '队列系统已重新初始化',
            status
        };
    } catch (error) {
        console.error('重新初始化队列系统失败:', error);
        return {
            success: false,
            error: '重新初始化队列系统失败',
            details: (error as Error).message,
            stack: (error as Error).stack
        };
    }
} 