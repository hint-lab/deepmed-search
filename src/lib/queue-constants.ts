import { ConnectionOptions } from 'bullmq';

/**
 * 队列名称常量
 */
export const QUEUE_NAMES = {
    PDF_PROCESSING: 'pdf-processing',
    DOCUMENT_CONVERT: 'document-convert',
    DOCUMENT_INDEX: 'document-index',
    SYSTEM_TASK: 'system-task'
} as const;

/**
 * 队列类型
 */
export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

/**
 * 队列服务配置
 */
export const QUEUE_CONFIG = {
    URL: process.env.QUEUE_SERVICE_URL || 'http://localhost:3000',
    PREFIX: process.env.QUEUE_PREFIX || 'deepmed',
    REDIS: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0')
    } as ConnectionOptions
} as const;

/**
 * 任务类型
 */
export const TASK_TYPES = {
    PDF_PROCESS: 'pdf-process',
    DOCUMENT_CONVERT: 'document-convert',
    DOCUMENT_INDEX: 'document-index',
    SYSTEM_TASK: 'system-task'
} as const;

/**
 * 任务类型
 */
export type TaskType = typeof TASK_TYPES[keyof typeof TASK_TYPES]; 