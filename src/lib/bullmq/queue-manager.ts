import { Queue, Worker, Job, QueueOptions, WorkerOptions, JobsOptions, ConnectionOptions } from 'bullmq';
import { Redis, RedisOptions } from 'ioredis';
import { TaskType, QueueHealthStatus, TaskStatus, ProcessJobData, JobStatus } from './types';
import { QUEUE_NAMES } from './queue-names';



// Redis连接配置
const connection: ConnectionOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null
};


// 任务选项
const jobOptions: JobsOptions = {
    attempts: 3,
    backoff: {
        type: 'exponential' as const,
        delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: 1000,
};

// 创建队列实例
const queues: { [key: string]: Queue } = {
    [TaskType.DOCUMENT_CONVERT_TO_MD]: new Queue(QUEUE_NAMES.DOCUMENT_TO_MARKDOWN, { connection }),
    [TaskType.CHUNK_VECTOR_INDEX]: new Queue(QUEUE_NAMES.CHUNK_VECTOR_INDEX, { connection }),
    [TaskType.DEEP_RESEARCH]: new Queue(QUEUE_NAMES.DEEP_RESEARCH, { connection }),
};

/**
 * 获取任务队列
 * @param type 任务类型
 * @returns 对应的队列实例
 */
export function getQueue<TData = any, TResult = any>(type: TaskType): Queue<TData, TResult> {
    const queue = queues[type];
    if (!queue) {
        throw new Error(`队列 ${type} 不存在`);
    }
    return queue as Queue<TData, TResult>;
}

// 导出处理队列（独立实例）
export const documentConvertProcessQueue = getQueue<any, any>(TaskType.DOCUMENT_CONVERT_TO_MD);
export const chunkIndexProcessQueue = getQueue<any, any>(TaskType.CHUNK_VECTOR_INDEX);
export const researchQueue = getQueue<any, any>(TaskType.DEEP_RESEARCH);



/**
 * 添加任务到队列
 * @param type 任务类型
 * @param data 任务数据
 * @returns 任务ID
 */
export async function addTask<TData = any>(type: TaskType, data: TData, name: string = 'process'): Promise<string> {
    const queue = getQueue<TData>(type);
    const job = await queue.add(name as any, data, jobOptions);
    console.log(`任务 '${name}' 已添加到队列 ${type} (Job ID: ${job.id})`);
    return job.id || '';
}

/**
 * 获取任务状态
 * @param jobId 任务ID
 * @returns 任务状态
 */
export async function getTaskStatus(jobId: string): Promise<TaskStatus | null> {
    for (const type of Object.values(TaskType)) {
        const queue = queues[type];
        if (!queue) continue;
        try {
            const job = await queue.getJob(jobId);
            if (job) {
                const state = await job.getState();
                console.log(`找到任务 ${jobId} 在队列 ${type} 中，状态: ${state}`);
                return {
                    state,
                    result: job.returnvalue,
                    data: job.data,
                };
            }
        } catch (error) {
            console.error(`在队列 ${type} 中查找任务 ${jobId} 时出错:`, error);
        }
    }
    console.log(`未在任何队列中找到任务 ${jobId}`);
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

    let redis: Redis | null = null;
    try {
        redis = new Redis(connection as RedisOptions);
        await redis.ping();
    } catch (error) {
        status.status = 'unhealthy';
        status.redis.status = 'disconnected';
        status.redis.error = error instanceof Error ? error.message : '连接失败';
    } finally {
        if (redis) {
            redis.quit();
        }
    }

    // 检查队列状态
    for (const type of Object.values(TaskType)) {
        const queue = queues[type];
        if (!queue) continue;
        try {
            const jobCounts = await queue.getJobCounts();
            status.queues[type] = jobCounts;

            status.performance.totalJobs += Object.values(jobCounts).reduce((sum, count) => sum + (count || 0), 0);
            status.performance.activeJobs += (jobCounts.active || 0);
            status.performance.completedJobs += (jobCounts.completed || 0);
            status.performance.failedJobs += (jobCounts.failed || 0);
        } catch (error) {
            status.queues[type] = { error: error instanceof Error ? error.message : '获取队列状态失败' };
        }
    }

    return status;
}

/**
 * 创建工作进程
 * @param type 任务类型
 * @param processor 处理函数
 * @returns Worker实例
 */
export function createWorker<TData = any, TResult = any>(
    type: TaskType,
    processor: (job: Job<TData, TResult>) => Promise<TResult>
): Worker<TData, TResult> {
    const queueNameMap: { [key: string]: string } = {
        [TaskType.DOCUMENT_CONVERT_TO_MD]: QUEUE_NAMES.DOCUMENT_TO_MARKDOWN,
        [TaskType.CHUNK_VECTOR_INDEX]: QUEUE_NAMES.CHUNK_VECTOR_INDEX,
        [TaskType.DEEP_RESEARCH]: QUEUE_NAMES.DEEP_RESEARCH,
    };

    const actualQueueName = queueNameMap[type];
    if (!actualQueueName) {
        throw new Error(`未找到 TaskType ${type} 对应的队列名称映射`);
    }

    console.log(`创建 Worker 连接到队列: ${actualQueueName} (TaskType: ${type})`);
    const worker = new Worker<TData, TResult>(actualQueueName, processor, { connection });

    // 错误处理
    worker.on('error', (err) => {
        console.error(`Worker for ${actualQueueName} error:`, err);
    });

    worker.on('failed', (job, err) => {
        console.error(`Job in ${actualQueueName} failed:`, job?.id || 'unknown', err);
    });

    worker.on('completed', (job, result) => {
        console.log(`Job in ${actualQueueName} completed:`, job.id, 'Result:', result);
    });

    worker.on('active', (job) => {
        console.log(`Job in ${actualQueueName} started:`, job.id);
    });

    return worker;
}

// 获取任务状态
export async function getJobStatus(jobId: string): Promise<JobStatus> {
    try {
        for (const type of Object.values(TaskType)) {
            const queue = queues[type];
            if (!queue) continue;
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
        console.error(`获取任务 ${jobId} 状态失败:`, error);
    }

    return {
        state: 'not_found',
        progress: 0
    };
} 