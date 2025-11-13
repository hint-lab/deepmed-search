import { Queue, Worker, Job, QueueOptions, WorkerOptions, JobsOptions, ConnectionOptions } from 'bullmq';
import { Redis, RedisOptions } from 'ioredis';
import { TaskType, QueueHealthStatus, TaskStatus, ProcessJobData, JobStatus } from './types';
import { QUEUE_NAMES } from './queue-names';



// Redis连接配置
// 支持 REDIS_URL 或独立的 REDIS_HOST/PORT 配置
function getRedisConnection(): ConnectionOptions {
    // 优先使用 REDIS_URL
    if (process.env.REDIS_URL) {
        const url = new URL(process.env.REDIS_URL);
        return {
            host: url.hostname,
            port: parseInt(url.port || '6379'),
            password: url.password || process.env.REDIS_PASSWORD,
            maxRetriesPerRequest: null
        };
    }

    // 回退到独立配置
    return {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: null
    };
}

const connection: ConnectionOptions = getRedisConnection();


// 任务选项
const jobOptions: JobsOptions = {
    attempts: 3,
    backoff: {
        type: 'exponential' as const,
        delay: 1000,
    },
    // 保留最近 100 个已完成的任务，方便在 BullMQ Board 中查看历史
    removeOnComplete: {
        age: 3600, // 保留 1 小时
        count: 100, // 最多保留 100 个
    },
    removeOnFail: 1000,
};

// 创建队列实例
const queues: { [key: string]: Queue } = {
    [TaskType.DOCUMENT_CONVERT_TO_MD]: new Queue(QUEUE_NAMES.DOCUMENT_TO_MARKDOWN, { connection }),
    [TaskType.CHUNK_VECTOR_INDEX]: new Queue(QUEUE_NAMES.CHUNK_VECTOR_INDEX, { connection }),
    [TaskType.DEEP_RESEARCH]: new Queue(QUEUE_NAMES.DEEP_RESEARCH, { connection }),
};

/**
 * 获取任务队列名称
 * @param type 任务类型
 * @returns 对应的队列名称
 */
function getQueueName(type: TaskType): string {
    const queueNameMap: { [key: string]: string } = {
        [TaskType.DOCUMENT_CONVERT_TO_MD]: QUEUE_NAMES.DOCUMENT_TO_MARKDOWN,
        [TaskType.CHUNK_VECTOR_INDEX]: QUEUE_NAMES.CHUNK_VECTOR_INDEX,
        [TaskType.DEEP_RESEARCH]: QUEUE_NAMES.DEEP_RESEARCH,
    };
    return queueNameMap[type] || type;
}

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
    const queueName = getQueueName(type);
    const job = await queue.add(name as any, data as any, jobOptions);
    console.log(`[${queueName}] 任务 '${name}' 已添加到队列 ${type} (Job ID: ${job.id})`);
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
        const queueName = getQueueName(type);
        try {
            const job = await queue.getJob(jobId);
            if (job) {
                const state = await job.getState();
                console.log(`[${queueName}] 找到任务 ${jobId} 在队列 ${type} 中，状态: ${state}`);
                return {
                    state,
                    result: job.returnvalue,
                    data: job.data,
                };
            }
        } catch (error) {
            console.error(`[${queueName}] 在队列 ${type} 中查找任务 ${jobId} 时出错:`, error);
        }
    }
    console.log(`[QueueManager] 未在任何队列中找到任务 ${jobId}`);
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
    const actualQueueName = getQueueName(type);

    console.log(`[${actualQueueName}] 创建 Worker 连接到队列: ${actualQueueName} (TaskType: ${type})`);

    // 对于文档处理 Worker，显示可用的解析器服务
    if (type === TaskType.DOCUMENT_CONVERT_TO_MD) {
        const parsers = [];
        if (process.env.MARKITDOWN_URL) {
            parsers.push(`MarkItDown(${process.env.MARKITDOWN_URL})`);
        }
        if (process.env.MINERU_URL) {
            parsers.push(`MinerU(${process.env.MINERU_URL})`);
        }
        // MinerU Cloud 不需要检查环境变量，API Key 从用户配置中读取
        parsers.push('MinerU-Cloud(需用户配置)');

        console.log(`[${actualQueueName}]   📄 可用的文档解析器服务: ${parsers.join(', ') || '默认(MarkItDown)'}`);
        console.log(`[${actualQueueName}]   ℹ️  实际使用的解析器由用户在 /settings/document 页面配置`);
        console.log(`[${actualQueueName}]   💡 提示: MinerU Cloud 的 API Key 从用户配置中读取（非环境变量）`);
        // 调试信息：显示环境变量值
        console.log(`[${actualQueueName}]   🔍 Docker 服务端点检查:`, {
            MARKITDOWN_URL: process.env.MARKITDOWN_URL || '(未设置)',
            MINERU_URL: process.env.MINERU_URL || '(未设置)',
        });
    }

    const worker = new Worker<TData, TResult>(actualQueueName, processor, { connection });

    // 错误处理
    worker.on('error', (err) => {
        console.error(`[${actualQueueName}] Worker error:`, err);
    });

    worker.on('failed', (job, err) => {
        console.error(`[${actualQueueName}] Job failed:`, job?.id || 'unknown', err);
    });

    worker.on('completed', (job, result) => {
        console.log(`[${actualQueueName}] Job completed:`, job.id, 'Result:', result);
    });

    worker.on('active', (job) => {
        console.log(`[${actualQueueName}] Job started:`, job.id);
        // 文档处理任务会在处理器中输出用户选择的解析器信息
    });

    return worker;
}

// 获取任务状态
export async function getJobStatus(jobId: string): Promise<JobStatus> {
    try {
        for (const type of Object.values(TaskType)) {
            const queue = queues[type];
            if (!queue) continue;
            const queueName = getQueueName(type);
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
        console.error(`[QueueManager] 获取任务 ${jobId} 状态失败:`, error);
    }

    return {
        state: 'not_found',
        progress: 0
    };
} 