export interface IChunk {
    id: string;
    chunk_id: string;
    content_with_weight: string;
    available_int: number;
    doc_id: string;
    doc_name: string;
    img_id?: string;
    important_kwd: string[];
    question_kwd: string[];
    tag_kwd: string[];
    positions: Record<string, any>;
    tag_feas?: Record<string, any>;
    kb_id: string;
    createdAt: Date;
    updatedAt: Date;
} 