export interface IKnowledgeBase {
    id: string;
    name: string;
    description?: string;
    avatar?: string;
    chunk_num: number;
    create_date: Date;
    create_time: bigint;
    created_by: string;
    doc_num: number;
    parser_config?: any;
    parser_id?: string;
    permission?: string;
    similarity_threshold: number;
    status: string;
    tenant_id?: string;
    token_num: number;
    update_date: Date;
    update_time: bigint;
    vector_similarity_weight: number;
    embd_id?: string;
    nickname?: string;
    language?: string;
    operator_permission: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface ITag {
    id: string;
    name: string;
    knowledgeBaseId: string;
    createdAt: Date;
    updatedAt: Date;
} 