// Milvus 配置常量（非 Server Action）

// 向量维度配置
export const VECTOR_DIMENSIONS = {
    'text-embedding-ada-002': 1536,
    'text-embedding-3-small': 1536,
    'text-embedding-3-large': 3072,
    'openai-text-embedding': 1536, // 默认
} as const;

// Milvus 配置
export const MILVUS_ADDRESS = process.env.MILVUS_ADDRESS || 'localhost:19530';
export const COLLECTION_NAME = 'deepmed_chunks';

