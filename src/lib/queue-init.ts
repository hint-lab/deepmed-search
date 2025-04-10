// 服务器端队列系统初始化
import { workers, closeAll } from './bullmq';

/**
 * 初始化队列系统
 * 这个函数应该在服务器启动时调用
 */
export function initQueueSystem() {
    console.log('🚀 正在初始化队列系统...');

    // 为每个worker设置错误处理
    workers.forEach(worker => {
        worker.on('completed', job => {
            console.log(`✅ 任务 ${job.id} 已完成`);
        });

        worker.on('failed', (job, err) => {
            console.error(`❌ 任务 ${job?.id} 失败:`, err);
        });

        worker.on('error', err => {
            console.error('🔥 队列工作器错误:', err);
        });
    });

    console.log(`✅ 队列系统已初始化，工作器数量: ${workers.length}`);

    // 确保在应用关闭时正确清理队列连接
    process.on('SIGTERM', async () => {
        console.log('正在关闭队列系统...');
        try {
            await closeAll();
            console.log('队列系统已安全关闭');
        } catch (error) {
            console.error('关闭队列系统时出错:', error);
        }
    });
}

// 不要在这里重新导出bullmq功能，避免循环引用
// 应该直接从bullmq导入 