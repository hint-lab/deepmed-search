"use server"

import { MilvusClient } from '@zilliz/milvus2-sdk-node';
import logger from '@/utils/logger';
import { MILVUS_ADDRESS, COLLECTION_NAME } from './config';

let milvusClient: MilvusClient | null = null;

/**
 * 获取 Milvus 客户端实例（单例模式）
 */
export async function getMilvusClient(): Promise<MilvusClient> {
    if (!milvusClient) {
        milvusClient = new MilvusClient({
            address: MILVUS_ADDRESS,
        });
        logger.info('Milvus 客户端已创建', { address: MILVUS_ADDRESS });
    }
    return milvusClient;
}

/**
 * 检查 Milvus 连接是否可用
 */
export async function checkMilvusConnection(): Promise<boolean> {
    try {
        const client = await getMilvusClient();
        const result = await client.checkHealth();
        logger.info('Milvus 连接检查成功', { isHealthy: result.isHealthy });
        return result.isHealthy;
    } catch (error) {
        logger.error('Milvus 连接检查失败', { 
            error: error instanceof Error ? error.message : error 
        });
        return false;
    }
}

/**
 * 确保集合存在，如果不存在则创建
 */
export async function ensureCollection(
    collectionName: string = COLLECTION_NAME,
    dimension: number = 1536
): Promise<boolean> {
    try {
        const client = await getMilvusClient();
        
        // 检查集合是否存在
        const hasCollection = await client.hasCollection({
            collection_name: collectionName,
        });

        if (hasCollection.value) {
            logger.info('集合已存在', { collectionName });
            return true;
        }

        // 创建集合
        await client.createCollection({
            collection_name: collectionName,
            fields: [
                {
                    name: 'id',
                    description: 'Chunk ID',
                    data_type: 'VarChar',
                    is_primary_key: true,
                    max_length: 100,
                },
                {
                    name: 'chunk_id',
                    description: 'Unique chunk identifier',
                    data_type: 'VarChar',
                    max_length: 100,
                },
                {
                    name: 'content',
                    description: 'Chunk content',
                    data_type: 'VarChar',
                    max_length: 65535,
                },
                {
                    name: 'doc_id',
                    description: 'Document ID',
                    data_type: 'VarChar',
                    max_length: 100,
                },
                {
                    name: 'doc_name',
                    description: 'Document name',
                    data_type: 'VarChar',
                    max_length: 500,
                },
                {
                    name: 'kb_id',
                    description: 'Knowledge base ID',
                    data_type: 'VarChar',
                    max_length: 100,
                },
                {
                    name: 'embedding',
                    description: 'Vector embedding',
                    data_type: 'FloatVector',
                    dim: dimension,
                },
            ],
        });

        // 创建索引
        await client.createIndex({
            collection_name: collectionName,
            field_name: 'embedding',
            index_type: 'IVF_FLAT',
            metric_type: 'COSINE',
            params: { nlist: 1024 },
        });

        // 加载集合到内存
        await client.loadCollection({
            collection_name: collectionName,
        });

        logger.info('集合创建成功', { collectionName, dimension });
        return true;
    } catch (error) {
        logger.error('创建集合失败', { 
            error: error instanceof Error ? error.message : error,
            collectionName 
        });
        return false;
    }
}

/**
 * 关闭 Milvus 连接
 */
export async function closeMilvusConnection() {
    try {
        if (milvusClient) {
            // Milvus SDK 2.x 没有显式的 close 方法
            // 只需将引用设置为 null
            milvusClient = null;
            logger.info('Milvus 连接已关闭');
        }
    } catch (error) {
        logger.error('关闭 Milvus 连接失败', { 
            error: error instanceof Error ? error.message : error 
        });
        throw error;
    }
}

/**
 * 获取集合名称
 */
export async function getCollectionName(): Promise<string> {
    return COLLECTION_NAME;
}

