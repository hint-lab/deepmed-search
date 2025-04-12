"use server"

import { Client } from 'minio';
import pLimit from 'p-limit';
import { DEFAULT_CONFIG, getMinioEndpoint } from './config';

// 连接池
const connectionPool: Client[] = [];
// 并发限制器
const limit = pLimit(DEFAULT_CONFIG.maxConnections);

/**
 * 创建新的 MinIO 客户端实例
 */
function createMinioClient(): Client {
    return new Client({
        endPoint: getMinioEndpoint(),
        port: DEFAULT_CONFIG.port,
        useSSL: DEFAULT_CONFIG.useSSL,
        accessKey: DEFAULT_CONFIG.accessKey,
        secretKey: DEFAULT_CONFIG.secretKey,
    });
}

/**
 * 获取 MinIO 客户端实例
 * 从连接池中获取或创建新的客户端
 */
export async function getMinioClient(): Promise<Client> {
    // 如果连接池未满，创建新连接
    if (connectionPool.length < DEFAULT_CONFIG.maxConnections) {
        const client = createMinioClient();
        connectionPool.push(client);
        return client;
    }

    // 从连接池中获取一个可用的连接
    return connectionPool[Math.floor(Math.random() * connectionPool.length)];
}

/**
 * 带重试的 MinIO 操作执行器
 */
export async function executeWithRetry<T>(operation: (client: Client) => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= DEFAULT_CONFIG.maxRetries; attempt++) {
        try {
            const client = await getMinioClient();
            return await operation(client);
        } catch (error) {
            lastError = error as Error;
            console.warn(`MinIO 操作失败 (尝试 ${attempt}/${DEFAULT_CONFIG.maxRetries}):`, error);

            if (attempt < DEFAULT_CONFIG.maxRetries) {
                await new Promise(resolve => setTimeout(resolve, DEFAULT_CONFIG.retryDelay));
            }
        }
    }

    throw lastError;
}

// 导出并发限制器供其他模块使用
export { limit }; 