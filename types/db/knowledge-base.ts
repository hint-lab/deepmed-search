import { Document } from './document';
import { Tag } from './tag';
import { Chunk } from './chunk';
import { Dialog } from './dialog';
import { Tenant } from './tenant';

// 知识库模型类型定义
export interface KnowledgeBase {
    id: string;
    name: string;
    description?: string | null;
    avatar?: string | null;
    chunk_num: number;
    create_date: Date;
    create_time: bigint;
    created_by: string;
    doc_num: number;
    parser_config?: any | null;
    parser_id?: string | null;
    permission?: string | null;
    similarity_threshold: number;
    status: string;
    tenant_id?: string | null;
    token_num: number;
    update_date: Date;
    update_time: bigint;
    vector_similarity_weight: number;
    embd_id?: string | null;
    nickname?: string | null;
    language?: string | null;
    operator_permission: number;
    createdAt: Date;
    updatedAt: Date;
    documents: Document[];
    tags: Tag[];
    chunks: Chunk[];
    dialogs: Dialog[];
    tenant?: Tenant | null;
}

// 知识库创建参数
export interface CreateKnowledgeBaseParams {
    name: string;
    description?: string;
    avatar?: string;
    created_by: string;
    parser_config?: any;
    parser_id?: string;
    permission?: string;
    similarity_threshold?: number;
    status?: string;
    tenant_id?: string;
    vector_similarity_weight?: number;
    embd_id?: string;
    nickname?: string;
    language?: string;
    operator_permission?: number;
}

// 知识库更新参数
export interface UpdateKnowledgeBaseParams {
    name?: string;
    description?: string;
    avatar?: string;
    parser_config?: any;
    parser_id?: string;
    permission?: string;
    similarity_threshold?: number;
    status?: string;
    tenant_id?: string;
    vector_similarity_weight?: number;
    embd_id?: string;
    nickname?: string;
    language?: string;
    operator_permission?: number;
} 