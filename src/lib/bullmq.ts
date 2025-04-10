import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { pdfProcessingProcessor, documentConvertToMarkdownProcessor, documentIndexingProcessor } from './queue-processors';

// Redis连接配置
const connection = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null // 这是BullMQ的一个特定需求，当与ioredis一起使用时，maxRetriesPerRequest参数必须设置为null
});

// 队列名称常量 - 确保与Redis中实际队列名称一致（全部小写且使用连字符）
export const QUEUE_NAMES = {
    PDF_PROCESSING: 'pdf-processing',
    DOCUMENT_INDEXING: 'document-indexing',
    DOCUMENT_CONVERT_TO_MARKDOWN: 'document-convert-to-markdown'
} as const;

// 队列名称类型
export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

// 创建队列
export const queues: Record<QueueName, Queue> = {
    'pdf-processing': new Queue('pdf-processing', { connection }),
    'document-indexing': new Queue('document-indexing', { connection }),
    'document-convert-to-markdown': new Queue('document-convert-to-markdown', { connection })
};

// 任务处理函数映射
const processors: Record<QueueName, (job: Job) => Promise<any>> = {
    'pdf-processing': pdfProcessingProcessor,
    'document-indexing': documentIndexingProcessor,
    'document-convert-to-markdown': documentConvertToMarkdownProcessor
};

// 创建Workers
export const workers = Object.values(QUEUE_NAMES).map((queueName) => {
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
export async function addJob(queueName: string, data: any): Promise<Job> {
    // 验证队列名称
    if (!(queueName in QUEUE_NAMES)) {
        throw new Error(`无效的队列名称: ${queueName}`);
    }

    // 获取队列的实际名称
    const actualQueueName = QUEUE_NAMES[queueName as keyof typeof QUEUE_NAMES];

    // 检查队列是否存在
    if (!queues[actualQueueName]) {
        throw new Error(`队列 ${actualQueueName} 不存在`);
    }

    console.log(`添加任务到队列 ${queueName} (${actualQueueName}):`, data);

    return await queues[actualQueueName].add('default', data, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000
        }
    });
}

// 辅助函数：获取队列状态
export async function getQueueStatus(queueName: string) {
    // 获取队列的实际名称
    const actualQueueName = QUEUE_NAMES[queueName as keyof typeof QUEUE_NAMES] || queueName;

    // 检查队列是否存在
    if (!queues[actualQueueName as QueueName]) {
        throw new Error(`队列 ${actualQueueName} 不存在`);
    }

    // 获取各种状态的任务数量
    const [waiting, active, completed, failed, delayed] = await Promise.all([
        queues[actualQueueName as QueueName].getWaitingCount(),
        queues[actualQueueName as QueueName].getActiveCount(),
        queues[actualQueueName as QueueName].getCompletedCount(),
        queues[actualQueueName as QueueName].getFailedCount(),
        queues[actualQueueName as QueueName].getDelayedCount(),
    ]);

    return {
        waiting,
        active,
        completed,
        failed,
        delayed
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

export { connection };
