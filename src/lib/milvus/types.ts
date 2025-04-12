import { MilvusClient } from '@zilliz/milvus2-sdk-node';

// Milvus 配置类型
export interface MilvusConfig {
    host: string;
    port: number;
    maxConnections: number;
    maxRetries: number;
    retryDelay: number;
    timeout: number;
}

// Milvus 集合字段类型
export interface MilvusField {
    name: string;
    data_type: number;
    is_primary_key?: boolean;
    autoID?: boolean;
    max_length?: number;
    dim?: number;
}

// Milvus 集合配置类型
export interface MilvusCollectionConfig {
    collection_name: string;
    fields: MilvusField[];
}

// Milvus 索引配置类型
export interface MilvusIndexConfig {
    collection_name: string;
    field_name: string;
    index_type: string;
    metric_type: string;
}

// Milvus 搜索参数类型
export interface MilvusSearchParams {
    collection_name: string;
    vector: number[];
    limit: number;
    output_fields: string[];
    filter?: string;
}

// Milvus 插入数据参数类型
export interface MilvusInsertParams {
    collection_name: string;
    data: Record<string, any>[];
}

// Milvus 向量数据插入参数类型
export interface MilvusVectorInsertParams {
    collectionName: string;
    vectors: number[][];
    contents: string[];
    docIds: string[];
    metadataList: Record<string, any>[];
}

// Milvus 客户端类型
export type MilvusClientType = MilvusClient; 