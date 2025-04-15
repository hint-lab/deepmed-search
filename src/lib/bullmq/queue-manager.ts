import { Queue, Worker, Job } from 'bullmq';
import { TaskType, QueueHealthStatus, TaskStatus, ProcessJobData, JobStatus } from './types';
import { DocumentProcessJobData } from './document-worker/types';
import { QUEUE_NAMES } from './queue-names';
// Redis连接配置
const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
};


// 任务选项
const jobOptions = {
    attempts: 3,
    backoff: {
        type: 'exponential',
        delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
};

// 创建队列实例
const queues: Record<TaskType, Queue> = {
    [TaskType.DOCUMENT_CONVERT_TO_MD]: new Queue(QUEUE_NAMES.DOCUMENT_TO_MARKDOWN, { connection }),
    [TaskType.DOCUMENT_SPLIT_TO_CHUNKS]: new Queue(QUEUE_NAMES.DOCUMENT_SPLIT_TO_CHUNKS, { connection }),
    [TaskType.CHUNK_VECTOR_INDEX]: new Queue(QUEUE_NAMES.CHUNK_VECTOR_INDEX, { connection }),
};

/**
 * 获取任务队列
 * @param type 任务类型
 * @returns 对应的队列实例
 */
export function getQueue<TData, TResult>(type: TaskType): Queue<TData, TResult> {
    const queue = queues[type];
    if (!queue) {
        throw new Error(`队列 ${type} 不存在`);
    }
    return queue as Queue<TData, TResult>;
}

// 导出处理队列（独立实例）
export const documentConvertProcessQueue = getQueue<DocumentProcessJobData, any>(TaskType.DOCUMENT_CONVERT_TO_MD);
export const documentSplitProcessQueue = getQueue<ProcessJobData, any>(TaskType.DOCUMENT_SPLIT_TO_CHUNKS);
export const chunkIndexProcessQueue = getQueue<ProcessJobData, any>(TaskType.CHUNK_VECTOR_INDEX);



/**
 * 添加任务到队列
 * @param type 任务类型
 * @param data 任务数据
 * @returns 任务ID
 */
export async function addTask(type: TaskType, data: any): Promise<string> {
    const queue = queues[type];
    if (!queue) {
        throw new Error(`队列 ${type} 不存在`);
    }

    const job = await queue.add('process', data, jobOptions);
    return job.id || '';
}

/**
 * 获取任务状态
 * @param jobId 任务ID
 * @returns 任务状态
 */
export async function getTaskStatus(jobId: string): Promise<TaskStatus | null> {
    // 遍历所有队列查找任务
    for (const queue of Object.values(queues)) {
        const job = await queue.getJob(jobId);
        if (job) {
            const state = await job.getState();
            return {
                state,
                result: job.returnvalue,
                data: job.data,
            };
        }
    }

    return null;
}

/**
 * 检查队列系统健康状态
 * @returns 队列系统健康状态
 */
export async function checkQueueHealth(): Promise<QueueHealthStatus> {
    const status: QueueHealthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        redis: {
            status: 'connected',
            details: '',
            error: null,
        },
        queues: {},
        performance: {
            totalJobs: 0,
            activeJobs: 0,
            completedJobs: 0,
            failedJobs: 0,
        },
    };

    try {
        // 检查Redis连接
        const client = await import('ioredis');
        const redis = new client.default(connection);
        redis.ping();
        redis.quit();
    } catch (error) {
        status.status = 'unhealthy';
        status.redis.status = 'disconnected';
        status.redis.error = error instanceof Error ? error.message : '连接失败';
    }

    // 检查队列状态
    for (const [name, queue] of Object.entries(queues)) {
        try {
            const jobCounts = await queue.getJobCounts();
            status.queues[name] = jobCounts;

            status.performance.totalJobs += jobCounts.waiting + jobCounts.active + jobCounts.completed + jobCounts.failed;
            status.performance.activeJobs += jobCounts.active;
            status.performance.completedJobs += jobCounts.completed;
            status.performance.failedJobs += jobCounts.failed;
        } catch (error) {
            status.queues[name] = { error: error instanceof Error ? error.message : '获取队列状态失败' };
        }
    }

    return status;
}

/**
 * 创建工作进程
 * @param queueName 队列名称
 * @param processor 处理函数
 * @returns Worker实例
 */
export function createWorker<TData, TResult>(
    queueName: TaskType,
    processor: (job: Job<TData, TResult>) => Promise<TResult>
): Worker<TData, TResult> {
    const queueNameMap: Record<TaskType, string> = {
        [TaskType.DOCUMENT_CONVERT_TO_MD]: QUEUE_NAMES.DOCUMENT_TO_MARKDOWN,
        [TaskType.DOCUMENT_SPLIT_TO_CHUNKS]: QUEUE_NAMES.DOCUMENT_SPLIT_TO_CHUNKS,
        [TaskType.CHUNK_VECTOR_INDEX]: QUEUE_NAMES.CHUNK_VECTOR_INDEX,
    };

    const worker = new Worker<TData, TResult>(queueNameMap[queueName], processor, { connection });

    // 错误处理
    worker.on('error', (err) => {
        console.error('Worker error:', err);
    });

    worker.on('failed', (job, err) => {
        console.error('Job failed:', job?.id || 'unknown', err);
    });

    return worker;
}

// 导出添加任务的方法
export async function addJob<TData, TResult>(
    queue: Queue<TData, TResult>,
    data: TData,
    options = jobOptions
): Promise<Job<TData, TResult>> {
    return queue.add('process' as any, data as any, options) as Promise<Job<TData, TResult>>;
}

// 获取任务状态
export async function getJobStatus(jobId: string): Promise<JobStatus> {
    try {
        // 遍历所有队列查找任务
        for (const queue of Object.values(queues)) {
            const job = await queue.getJob(jobId);
            if (job) {
                const state = await job.getState();
                const progress = await job.progress();
                const result = job.returnvalue;
                const failedReason = job.failedReason;

                return {
                    state,
                    progress: typeof progress === 'number' ? progress : 0,
                    result,
                    failedReason
                };
            }
        }
    } catch (error) {
        console.error('获取任务状态失败:', error);
        throw error;
    }

    return {
        state: 'not_found',
        progress: 0
    };
} 