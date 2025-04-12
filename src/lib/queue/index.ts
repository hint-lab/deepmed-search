export * from './types';
export * from './config';
export * from './operations';

// 初始化函数
export async function initQueueSystem() {
    try {
        console.log('  📋 初始化队列系统...');

        // 首先检查队列服务是否可用
        const { isQueueServiceAvailable } = await import('./operations');
        const serviceAvailable = await isQueueServiceAvailable();

        if (!serviceAvailable) {
            console.warn('  ⚠️ 队列服务不可用，跳过队列初始化');
            return true; // 返回 true 以允许应用继续启动
        }

        // 检查并创建队列
        const { queueExists, createQueue } = await import('./operations');
        const { QUEUE_NAMES } = await import('./config');

        for (const [key, queueName] of Object.entries(QUEUE_NAMES)) {
            const exists = await queueExists(queueName);
            if (!exists) {
                console.log(`  📋 创建队列: ${queueName}`);
                await createQueue(queueName);
            }
        }

        // 检查队列系统健康状态
        const { checkQueueHealth } = await import('./operations');
        const healthStatus = await checkQueueHealth();

        if (healthStatus.status !== 'healthy') {
            console.warn(`  ⚠️ 队列系统健康检查失败: ${healthStatus.status}`);
            // 不抛出错误，允许应用继续启动
            return true;
        }

        console.log('  ✅ 队列系统初始化成功');
        return true;
    } catch (error) {
        console.error('  ❌ 队列系统初始化失败:', error);
        // 不抛出错误，允许应用继续启动
        return true;
    }
} 