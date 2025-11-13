
import { ITenant } from './tenant';

// 知识库模型类型定义
export interface IKnowledgeBase {
    id: string;
    name: string;
    description?: string | null;
    avatar?: string | null;
    chunk_num: number;
    created_at: Date;
    created_by: string;
    doc_num: number;
    parser_config?: any | null;
    parser_id?: string | null;
    permission?: string | null;
    similarity_threshold: number;
    status: string;
    tenant_id?: string | null;
    token_num: number;
    updated_at: Date;
    visible: boolean;
    vector_similarity_weight: number;
    embd_id?: string | null;
    nickname?: string | null;
    language?: string | null;
    operator_permission: number;
    tenant?: ITenant | null;
    chunk_size: number;
    overlap_size: number;
    split_by: string;
    separators: string[];
}

// 知识库创建参数
export interface CreateIKnowledgeBaseParams {
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

// 知识库更新基本参数
export interface UpdateIKnowledgeBaseBasicParams {
    name?: string;
    description?: string;
    avatar?: string;
    language?: string;
}


// 知识库更新高级参数
export interface UpdateIKnowledgeAdvanceParams {
    chunk_size?: number;
    chunk_overlap?: number;
    separators?: string[];
    custom_rules?: string;
    split_by?: string;
    similarity_threshold?: number;
    vector_similarity_weight?: number;
    embd_id?: string;
    nickname?: string;
    language?: string;
    operator_permission?: number;
    parser_config?: any;
    parser_id?: string;
} 