
// 文档分块模型类型定义
export interface IChunk {
    id: string;
    chunk_id: string;
    content_with_weight: string;
    available_int: number;
    doc_id: string;
    doc_name: string;
    img_id?: string | null;
    important_kwd: string[];
    question_kwd: string[];
    tag_kwd: string[];
    positions: any;
    tag_feas?: any | null;
    kb_id: string;
    document: Document;
    createdAt: Date;
    updatedAt: Date;
}

// 文档分块创建参数
export interface CreateChunkParams {
    chunk_id: string;
    content_with_weight: string;
    doc_id: string;
    doc_name: string;
    img_id?: string;
    important_kwd: string[];
    question_kwd: string[];
    tag_kwd: string[];
    positions: any;
    tag_feas?: any;
    kb_id: string;
}

// 文档分块更新参数
export interface UpdateChunkParams {
    content_with_weight?: string;
    available_int?: number;
    important_kwd?: string[];
    question_kwd?: string[];
    tag_kwd?: string[];
    positions?: any;
    tag_feas?: any;
} 