import { QueueConfig } from './types';

// 队列名称常量
export const QUEUE_NAMES = {
    PDF_PROCESSING: 'pdf-processing',
    DOCUMENT_CONVERT: 'document-convert',
    DOCUMENT_INDEX: 'document-index',
    SYSTEM_TASK: 'system-task'
} as const;

// 队列类型
export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

// 任务类型
export const TASK_TYPES = {
    PDF_PROCESS: 'pdf-process',
    DOCUMENT_CONVERT: 'document-convert',
    DOCUMENT_INDEX: 'document-index',
    SYSTEM_TASK: 'system-task'
} as const;

// 任务类型
export type TaskType = typeof TASK_TYPES[keyof typeof TASK_TYPES];

// 队列服务配置
export const DEFAULT_CONFIG: QueueConfig = {
    url: process.env.QUEUE_SERVICE_URL || 'http://localhost:5000',
    prefix: process.env.QUEUE_PREFIX || 'deepmed',
    // 健康检查配置
    healthCheck: {
        maxRetries: parseInt(process.env.QUEUE_HEALTH_MAX_RETRIES || '3'),
        retryDelay: parseInt(process.env.QUEUE_HEALTH_RETRY_DELAY || '1000'),
        timeout: parseInt(process.env.QUEUE_HEALTH_TIMEOUT || '5000')
    }
};

/**
 * 获取队列服务URL
 * 优先从localStorage获取，如果没有则使用默认配置
 */
export function getQueueServiceUrl(): string {
    // 检查是否在浏览器环境
    if (typeof window !== 'undefined') {
        try {
            const savedUrl = localStorage.getItem('queueServiceUrl');
            if (savedUrl) {
                return savedUrl;
            }
        } catch (error) {
            console.warn('无法从localStorage获取队列服务URL:', error);
        }
    }

    // 使用环境变量或默认配置
    return process.env.QUEUE_SERVICE_URL || DEFAULT_CONFIG.url;
} 