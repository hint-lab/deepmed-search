import { Queue } from 'bullmq';
import { QUEUE_NAMES, QueueName, QUEUE_CONFIG } from './queue-constants';

// 队列实例映射
export const queues: Record<QueueName, Queue> = {} as Record<QueueName, Queue>;

/**
 * 初始化队列系统
 */
export async function initQueueSystem() {
    try {
        // 初始化所有队列
        for (const [key, name] of Object.entries(QUEUE_NAMES)) {
            queues[name] = new Queue(name, {
                connection: QUEUE_CONFIG.REDIS,
                prefix: QUEUE_CONFIG.PREFIX
            });
        }

        console.log('队列系统初始化成功');
        return true;
    } catch (error) {
        console.error('队列系统初始化失败:', error);
        throw error;
    }
}

/**
 * 关闭队列连接
 */
export async function closeQueues() {
    try {
        await Promise.all(
            Object.values(queues).map(queue => queue.close())
        );
        console.log('队列连接已关闭');
    } catch (error) {
        console.error('关闭队列连接失败:', error);
        throw error;
    }
} 