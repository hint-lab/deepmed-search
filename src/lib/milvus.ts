/**
 * Milvus 向量数据库连接工具
 */
import { MilvusClient } from '@zilliz/milvus2-sdk-node';

// 获取环境变量
const MILVUS_HOST = process.env.MILVUS_HOST || 'localhost';
const MILVUS_PORT = process.env.MILVUS_PORT || '19530';

// 维度配置 - 基于不同的嵌入模型
const EMBEDDING_DIMENSIONS = {
    'text-embedding-ada-002': 1536,
    'text-embedding-3-small': 1536,
    'text-embedding-3-large': 3072,
    'openai-text-embedding': 1536, // 默认
};

// 单例 Milvus 客户端
let milvusClientInstance: MilvusClient | null = null;

// 获取 Milvus 客户端实例
export function getMilvusClient(): MilvusClient {
    if (!milvusClientInstance) {
        milvusClientInstance = new MilvusClient({
            address: `${MILVUS_HOST}:${MILVUS_PORT}`,
        });
        console.log(`Milvus client initialized with address: ${MILVUS_HOST}:${MILVUS_PORT}`);
    }
    return milvusClientInstance;
}

// 检查并创建集合（如果不存在）
export async function ensureCollection(
    collectionName: string,
    dimension = 1536
): Promise<boolean> {
    const client = getMilvusClient();

    try {
        // 检查集合是否存在
        const exists = await client.hasCollection({
            collection_name: collectionName,
        });

        if (exists) {
            console.log(`Collection ${collectionName} already exists`);
            return true;
        }

        // 创建新集合
        await client.createCollection({
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
        });

        // 创建索引
        await client.createIndex({
            collection_name: collectionName,
            field_name: 'vector',
            index_type: 'AUTOINDEX', // 自动选择最佳索引类型
            metric_type: 'COSINE',
        });

        // 加载集合到内存
        await client.loadCollection({
            collection_name: collectionName,
        });

        console.log(`Collection ${collectionName} created and indexed successfully`);
        return true;
    } catch (error) {
        console.error(`Failed to ensure collection ${collectionName}:`, error);
        return false;
    }
}

// 查询相似文档
export async function searchSimilarDocuments(
    collectionName: string,
    queryVector: number[],
    limit = 5,
    filter = ''
) {
    const client = getMilvusClient();

    try {
        const searchResult = await client.search({
            collection_name: collectionName,
            vector: queryVector,
            limit,
            output_fields: ['doc_id', 'content', 'metadata'],
            filter,
        });

        return searchResult;
    } catch (error) {
        console.error(`Failed to search in collection ${collectionName}:`, error);
        throw error;
    }
}

// 插入向量数据
export async function insertVectors(
    collectionName: string,
    vectors: number[][],
    contents: string[],
    docIds: string[],
    metadataList: Record<string, any>[]
) {
    const client = getMilvusClient();

    if (vectors.length !== contents.length || vectors.length !== docIds.length) {
        throw new Error('Vectors, contents, and docIds must have the same length');
    }

    // 将元数据转换为字符串
    const metadataStrings = metadataList.map(metadata => JSON.stringify(metadata));

    try {
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

        const insertResult = await client.insert({
            collection_name: collectionName,
            data: rows,
        });

        return insertResult;
    } catch (error) {
        console.error(`Failed to insert vectors into collection ${collectionName}:`, error);
        throw error;
    }
}

// 关闭 Milvus 客户端连接
export async function closeMilvusConnection() {
    if (milvusClientInstance) {
        await milvusClientInstance.closeConnection();
        milvusClientInstance = null;
        console.log('Milvus client connection closed');
    }
}

// 导出常用的维度配置
export { EMBEDDING_DIMENSIONS }; 