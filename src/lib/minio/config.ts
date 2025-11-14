import { MinioConfig } from './types';

// 根据环境选择正确的连接方式
export function getMinioEndpoint(): string {
    if (process.env.NODE_ENV === 'development') {
        return 'localhost';
    }
    return process.env.MINIO_ENDPOINT || 'minio';
}

// MinIO 默认配置（使用 getter 延迟初始化，避免构建时连接）
let _defaultConfig: MinioConfig | null = null;

export const DEFAULT_CONFIG: MinioConfig = new Proxy({} as MinioConfig, {
    get(target, prop) {
        // 延迟初始化配置
        if (!_defaultConfig) {
            _defaultConfig = {
                endPoint: getMinioEndpoint(),
                port: parseInt(process.env.MINIO_PORT || '9000'),
                useSSL: process.env.MINIO_USE_SSL === 'true',
                accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
                secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
                // 连接池配置
                maxConnections: parseInt(process.env.MINIO_MAX_CONNECTIONS || '10'),
                // 重试配置
                maxRetries: parseInt(process.env.MINIO_MAX_RETRIES || '3'),
                retryDelay: parseInt(process.env.MINIO_RETRY_DELAY || '1000'),
                // 超时配置
                timeout: parseInt(process.env.MINIO_TIMEOUT || '30000'),
            };
        }
        return _defaultConfig[prop as keyof MinioConfig];
    }
});

// 默认存储桶名称
export const DEFAULT_BUCKET = process.env.MINIO_DEFAULT_BUCKET || 'deepmed';

/**
 * 文档类型和对应的文件夹
 * 
 * UPLOAD: 普通上传文档
 * - 用于用户直接上传的文档
 * - 存储在 uploads 文件夹下
 * - 通常用于临时文件或用户个人
 * 
 * KB: 知识库文档
 * - 用于知识库系统的文档
 * - 存储在 kb 文件夹下
 * - 通常用于系统知识库、FAQ、帮助文档等
 * - 可能会被索引和检索
 */
export const DOCUMENT_TYPES = {
    UPLOAD: 'uploads', // 普通上传文档
    KB: 'kb',         // 知识库文档
} as const;

// 公共访问 URL 配置
export const PUBLIC_CONFIG = {
    endpoint: process.env.NEXT_PUBLIC_MINIO_ENDPOINT || 'localhost',
    port: process.env.NEXT_PUBLIC_MINIO_PORT || '9000',
} as const; 