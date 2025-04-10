// 服务器端队列系统初始化
import { workers, closeAll, connection } from './bullmq';
import { EventEmitter } from 'events';

// 增加默认的最大监听器数量，避免触发警告
EventEmitter.defaultMaxListeners = 30;

// 状态标志，确保只初始化一次
let isInitialized = false;

/**
 * 初始化队列系统
 * 这个函数应该在服务器启动时调用
 */
export function initQueueSystem() {
    // 防止重复初始化
    if (isInitialized) {
        console.log('队列系统已经初始化过，跳过');
        return;
    }

    console.log('🚀 正在初始化队列系统...');

    // 设置更高的监听器限制
    connection.setMaxListeners(50);

    // 为每个worker设置错误处理
    workers.forEach(worker => {
        // 设置更高的监听器限制
        worker.setMaxListeners(20);

        worker.on('completed', job => {
            console.log(`✅ 任务 ${job.id} 已完成，结果:`, job.returnvalue);
        });

        worker.on('failed', (job, err) => {
            console.error(`❌ 任务 ${job?.id} 失败:`, err);
        });

        worker.on('error', err => {
            console.error('🔥 队列工作器错误:', err);
        });
    });

    console.log(`✅ 队列系统已初始化，工作器数量: ${workers.length}`);

    // 只在生产环境中添加进程终止事件监听
    // 这样避免在开发环境中频繁重启队列系统
    if (process.env.NODE_ENV === 'production') {
        console.log('添加生产环境队列清理事件监听...');

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
    } else {
        console.log('在开发环境中运行，跳过进程终止事件监听，避免队列系统频繁重启');

        // 在开发环境中添加SIGINT(Ctrl+C)处理，确保干净关闭
        process.on('SIGINT', async () => {
            console.log('接收到SIGINT信号，正在关闭队列系统...');
            try {
                await closeAll();
                console.log('队列系统已安全关闭');
                process.exit(0);
            } catch (error) {
                console.error('关闭队列系统时出错:', error);
                process.exit(1);
            }
        });
    }

    // 打印更详细的队列状态信息
    console.log('队列配置:');
    workers.forEach((worker, index) => {
        console.log(`Worker ${index + 1}: 处理队列 ${worker.name}`);
    });

    // 标记为已初始化
    isInitialized = true;
}

// 不要在这里重新导出bullmq功能，避免循环引用
// 应该直接从bullmq导入 