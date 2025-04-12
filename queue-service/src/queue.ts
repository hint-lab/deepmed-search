import { Queue, Worker, Job } from 'bullmq';
import { config } from 'dotenv';

config();

const {
    REDIS_HOST,
    REDIS_PORT,
    REDIS_PASSWORD,
    REDIS_DB,
    QUEUE_PREFIX
} = process.env;

// Redis配置
const redisConfig = {
    host: REDIS_HOST || 'localhost',
    port: parseInt(REDIS_PORT || '6379'),
    password: REDIS_PASSWORD,
    db: parseInt(REDIS_DB || '0')
};

// 创建队列实例
export function createQueue(name: string) {
    return new Queue(`${QUEUE_PREFIX}-${name}`, {
        connection: redisConfig
    });
}

// 创建Worker实例
export function createWorker(name: string, processor: (job: Job) => Promise<any>) {
    return new Worker(`${QUEUE_PREFIX}-${name}`, processor, {
        connection: redisConfig
    });
}

// 处理任务
export async function processTask(job: Job) {
    console.log(`处理任务 ${job.id}:`, job.data);

    try {
        // 这里添加具体的任务处理逻辑
        const result = await processJobData(job.data);

        return {
            success: true,
            result
        };
    } catch (error) {
        console.error(`任务 ${job.id} 处理失败:`, error);
        throw error;
    }
}

// 处理任务数据
async function processJobData(data: any) {
    // 根据任务类型执行不同的处理逻辑
    switch (data.type) {
        case 'example':
            return await handleExampleTask(data);
        case 'system-task':
            return await handleSystemTask(data);
        case 'pdf-process':
            return await handlePdfProcessTask(data);
        case 'document-convert':
            return await handleDocumentConvertTask(data);
        case 'document-index':
            return await handleDocumentIndexTask(data);
        default:
            throw new Error(`未知的任务类型: ${data.type}`);
    }
}

// 示例任务处理函数
async function handleExampleTask(data: any) {
    // 这里实现具体的任务处理逻辑
    return {
        processed: true,
        data
    };
}

// 系统任务处理函数
async function handleSystemTask(data: any) {
    // 这里实现系统任务处理逻辑
    return {
        processed: true,
        timestamp: Date.now(),
        action: data.action || 'unknown',
        status: 'success'
    };
}

// PDF处理任务处理函数
async function handlePdfProcessTask(data: any) {
    // 这里实现PDF处理任务逻辑
    return {
        processed: true,
        filename: data.filename || 'unknown',
        status: 'success'
    };
}

// 文档转换任务处理函数
async function handleDocumentConvertTask(data: any) {
    // 这里实现文档转换任务逻辑
    return {
        processed: true,
        documentId: data.documentId || 'unknown',
        status: 'success'
    };
}

// 文档索引任务处理函数
async function handleDocumentIndexTask(data: any) {
    // 这里实现文档索引任务逻辑
    return {
        processed: true,
        documentId: data.documentId || 'unknown',
        status: 'success'
    };
}