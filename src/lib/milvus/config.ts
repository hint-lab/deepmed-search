import { MilvusConfig } from './types';

// Milvus 默认配置
export const DEFAULT_CONFIG: MilvusConfig = {
    host: process.env.MILVUS_HOST || 'localhost',
    port: parseInt(process.env.MILVUS_PORT || '19530'),
    // 连接池配置
    maxConnections: parseInt(process.env.MILVUS_MAX_CONNECTIONS || '10'),
    // 重试配置
    maxRetries: parseInt(process.env.MILVUS_MAX_RETRIES || '3'),
    retryDelay: parseInt(process.env.MILVUS_RETRY_DELAY || '1000'),
    // 超时配置
    timeout: parseInt(process.env.MILVUS_TIMEOUT || '30000'),
};

// 根据环境选择正确的连接方式
export function getMilvusEndpoint(): string {
    if (process.env.NODE_ENV === 'development') {
        return 'localhost';
    }
    return process.env.MILVUS_HOST || 'deepmed-milvus';
}

// 维度配置 - 基于不同的嵌入模型
export const EMBEDDING_DIMENSIONS = {
    'text-embedding-ada-002': 1536,
    'text-embedding-3-small': 1536,
    'text-embedding-3-large': 3072,
    'openai-text-embedding': 1536, // 默认
} as const; 