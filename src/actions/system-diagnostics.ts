'use server';

import { QUEUE_NAMES } from '@/lib/queue-constants';
import { checkQueueHealth } from '@/lib/queue-init';

/**
 * 检查队列系统状态
 * 返回详细的诊断信息
 */
export async function checkQueueSystem() {
    try {
        // 获取队列健康状态
        const healthData = await checkQueueHealth();

        // 检查队列服务是否可用
        const queueServiceAvailable = healthData.status === 'healthy';

        // 检查各个队列是否已创建
        const queueStatus = Object.entries(QUEUE_NAMES).map(([key, queueName]) => {
            const queueInfo = healthData.queues[queueName] || { status: 'missing' };
            return {
                key,
                name: queueName,
                exists: queueInfo.status === 'healthy',
                status: queueInfo.status,
                details: queueInfo.details || null
            };
        });

        // 检查是否所有队列都已创建
        const allQueuesExist = queueStatus.every(q => q.exists);

        return {
            success: true,
            timestamp: new Date().toISOString(),
            queueSystemInitialized: queueServiceAvailable,
            allQueuesExist,
            queueStatus,
            queueNames: QUEUE_NAMES,
            redisStatus: healthData.redis
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
        const { initQueueSystemClient } = await import('@/lib/queue-init');
        await initQueueSystemClient();

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