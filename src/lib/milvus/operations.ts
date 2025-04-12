"use server"

import { executeWithRetry, limit } from './client';
import { EMBEDDING_DIMENSIONS } from './config';
import {
    MilvusCollectionConfig,
    MilvusIndexConfig,
    MilvusSearchParams,
    MilvusVectorInsertParams
} from './types';

/**
 * 检查 Milvus 连接是否可用
 */
export async function checkMilvusConnection(): Promise<boolean> {
    try {
        await executeWithRetry(async (client) => {
            await client.listCollections();
        });
        return true;
    } catch (error) {
        console.error('Milvus 连接检查失败:', error);
        return false;
    }
}

/**
 * 确保集合存在，如果不存在则创建
 */
export async function ensureCollection(
    collectionName: string,
    dimension = 1536
): Promise<boolean> {
    return executeWithRetry(async (client) => {
        try {
            // 检查集合是否存在
            const exists = await client.hasCollection({
                collection_name: collectionName,
            });

            if (exists) {
                console.log(`集合 ${collectionName} 已存在`);
                return true;
            }

            // 创建新集合
            const collectionConfig: MilvusCollectionConfig = {
                collection_name: collectionName,
                fields: [
                    {
                        name: 'id',
                        data_type: 5, // DataType.Int64
                        is_primary_key: true,
                        autoID: true,
                    },
                    {
                        name: 'doc_id',
                        data_type: 21, // DataType.VarChar
                        max_length: 255,
                    },
                    {
                        name: 'content',
                        data_type: 21, // DataType.VarChar
                        max_length: 65535,
                    },
                    {
                        name: 'metadata',
                        data_type: 21, // DataType.VarChar
                        max_length: 65535,
                    },
                    {
                        name: 'vector',
                        data_type: 101, // DataType.FloatVector
                        dim: dimension,
                    },
                ],
            };

            await client.createCollection(collectionConfig);

            // 创建索引
            const indexConfig: MilvusIndexConfig = {
                collection_name: collectionName,
                field_name: 'vector',
                index_type: 'AUTOINDEX', // 自动选择最佳索引类型
                metric_type: 'COSINE',
            };

            await client.createIndex(indexConfig);

            // 加载集合到内存
            await client.loadCollection({
                collection_name: collectionName,
            });

            console.log(`集合 ${collectionName} 创建并索引成功`);
            return true;
        } catch (error) {
            console.error(`确保集合 ${collectionName} 存在失败:`, error);
            return false;
        }
    });
}

/**
 * 查询相似文档
 */
export async function searchSimilarDocuments(
    collectionName: string,
    queryVector: number[],
    resultLimit = 5,
    filter = ''
) {
    return limit(() => executeWithRetry(async (client) => {
        try {
            const searchParams: MilvusSearchParams = {
                collection_name: collectionName,
                vector: queryVector,
                limit: resultLimit,
                output_fields: ['doc_id', 'content', 'metadata'],
                filter,
            };

            const searchResult = await client.search(searchParams);
            return searchResult;
        } catch (error) {
            console.error(`在集合 ${collectionName} 中搜索失败:`, error);
            throw error;
        }
    }));
}

/**
 * 插入向量数据
 */
export async function insertVectors({
    collectionName,
    vectors,
    contents,
    docIds,
    metadataList
}: MilvusVectorInsertParams) {
    return limit(() => executeWithRetry(async (client) => {
        try {
            if (vectors.length !== contents.length || vectors.length !== docIds.length) {
                throw new Error('向量、内容和文档ID的长度必须相同');
            }

            // 将元数据转换为字符串
            const metadataStrings = metadataList.map(metadata => JSON.stringify(metadata));

            // 按照 Milvus SDK 的规范创建数据
            const rows = [];
            for (let i = 0; i < vectors.length; i++) {
                rows.push({
                    doc_id: docIds[i],
                    content: contents[i],
                    metadata: metadataStrings[i],
                    vector: vectors[i],
                });
            }

            const insertParams = {
                collection_name: collectionName,
                data: rows,
            };

            const insertResult = await client.insert(insertParams);
            return insertResult;
        } catch (error) {
            console.error(`向集合 ${collectionName} 插入向量失败:`, error);
            throw error;
        }
    }));
}

/**
 * 关闭 Milvus 客户端连接
 */
export async function closeMilvusConnection() {
    return executeWithRetry(async (client) => {
        try {
            await client.closeConnection();
            console.log('Milvus 客户端连接已关闭');
        } catch (error) {
            console.error('关闭 Milvus 连接失败:', error);
            throw error;
        }
    });
} 