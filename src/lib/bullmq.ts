import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { Redis } from 'ioredis';

// Redis连接配置
const connection = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null // 这是BullMQ的一个特定需求，当与ioredis一起使用时，maxRetriesPerRequest参数必须设置为null
});

// 队列名称常量
export const QUEUE_NAMES: Record<string, string> = {
    PDF_PROCESSING: 'pdf-processing',
    DOCUMENT_INDEXING: 'document-indexing',
};

// 创建队列
export const queues = {
    [QUEUE_NAMES.PDF_PROCESSING]: new Queue(QUEUE_NAMES.PDF_PROCESSING, { connection }),
    [QUEUE_NAMES.DOCUMENT_INDEXING]: new Queue(QUEUE_NAMES.DOCUMENT_INDEXING, { connection }),
};

// 任务处理函数映射
const processors: Record<string, (job: Job) => Promise<any>> = {
    [QUEUE_NAMES.PDF_PROCESSING]: async (job: Job) => {
        console.log(`处理PDF文件: ${job.data.filename}`);
        // 这里实现PDF处理逻辑
        return { processed: true };
    },
    [QUEUE_NAMES.DOCUMENT_INDEXING]: async (job: Job) => {
        console.log(`为文档建立索引: ${job.data.documentId}`);
        // 这里实现索引建立逻辑
        return { indexed: true };
    },
};

// 创建Workers
export const workers = Object.entries(QUEUE_NAMES).map(([key, queueName]) => {
    return new Worker(queueName, processors[queueName], { connection });
});

// 监听事件
Object.entries(queues).forEach(([queueName, queue]) => {
    const queueEvents = new QueueEvents(queueName, { connection });

    queueEvents.on('completed', ({ jobId, returnvalue }) => {
        console.log(`任务 ${jobId} 已完成，结果:`, returnvalue);
    });

    queueEvents.on('failed', ({ jobId, failedReason }) => {
        console.error(`任务 ${jobId} 失败:`, failedReason);
    });
});

// 辅助函数：添加任务到队列
export async function addJob(queueName: string, data: any, options = {}) {
    if (!queues[queueName]) {
        throw new Error(`队列 ${queueName} 不存在`);
    }

    return await queues[queueName].add('default', data, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        ...options,
    });
}

// 辅助函数：获取队列状态
export async function getQueueStatus(queueName: string) {
    if (!queues[queueName]) {
        throw new Error(`队列 ${queueName} 不存在`);
    }

    const [waiting, active, completed, failed] = await Promise.all([
        queues[queueName].getWaitingCount(),
        queues[queueName].getActiveCount(),
        queues[queueName].getCompletedCount(),
        queues[queueName].getFailedCount(),
    ]);

    return {
        waiting,
        active,
        completed,
        failed,
    };
}

// 关闭所有连接
export async function closeAll() {
    await Promise.all([
        ...Object.values(queues).map(queue => queue.close()),
        ...workers.map(worker => worker.close()),
    ]);
    await connection.quit();
}
