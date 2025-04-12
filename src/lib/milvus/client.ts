"use server"

import { MilvusClient } from '@zilliz/milvus2-sdk-node';
import pLimit from 'p-limit';
import { DEFAULT_CONFIG, getMilvusEndpoint } from './config';
import { MilvusClientType } from './types';

// 连接池
const connectionPool: MilvusClientType[] = [];
// 并发限制器
const limit = pLimit(DEFAULT_CONFIG.maxConnections);

/**
 * 创建新的 Milvus 客户端实例
 */
function createMilvusClient(): MilvusClientType {
    return new MilvusClient({
        address: `${getMilvusEndpoint()}:${DEFAULT_CONFIG.port}`,
    });
}

/**
 * 获取 Milvus 客户端实例
 * 从连接池中获取或创建新的客户端
 */
export async function getMilvusClient(): Promise<MilvusClientType> {
    // 如果连接池未满，创建新连接
    if (connectionPool.length < DEFAULT_CONFIG.maxConnections) {
        const client = createMilvusClient();
        connectionPool.push(client);
        console.log(`Milvus 客户端已初始化，地址: ${getMilvusEndpoint()}:${DEFAULT_CONFIG.port}`);
        return client;
    }

    // 从连接池中获取一个可用的连接
    return connectionPool[Math.floor(Math.random() * connectionPool.length)];
}

/**
 * 带重试的 Milvus 操作执行器
 */
export async function executeWithRetry<T>(operation: (client: MilvusClientType) => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= DEFAULT_CONFIG.maxRetries; attempt++) {
        try {
            const client = await getMilvusClient();
            return await operation(client);
        } catch (error) {
            lastError = error as Error;
            console.warn(`Milvus 操作失败 (尝试 ${attempt}/${DEFAULT_CONFIG.maxRetries}):`, error);

            if (attempt < DEFAULT_CONFIG.maxRetries) {
                await new Promise(resolve => setTimeout(resolve, DEFAULT_CONFIG.retryDelay));
            }
        }
    }

    throw lastError;
}

// 导出并发限制器供其他模块使用
export { limit }; 