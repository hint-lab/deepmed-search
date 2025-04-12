import { DocumentProcessingStatus } from './enums';
import { KnowledgeBase } from './knowledge-base';
import { Tag } from './tag';
import { Chunk } from './chunk';
import { UploadFile } from './upload-file';

// 文档模型类型定义
export interface Document {
    id: string;
    name: string;
    content?: string | null;
    size: number;
    type: string;
    source_type: string;
    status: DocumentProcessingStatus;
    thumbnail?: string | null;
    chunk_num: number;
    token_num: number;
    progress: number;
    progress_msg?: string | null;
    process_begin_at?: Date | null;
    process_duation: number;
    create_date: Date;
    create_time: bigint;
    update_date: Date;
    update_time: bigint;
    created_by: string;
    knowledgeBaseId: string;
    parser_id?: string | null;
    parser_config: any;
    markdown_content?: string | null;
    summary?: string | null;
    metadata?: any | null;
    processing_status: DocumentProcessingStatus;
    processing_error?: string | null;
    knowledgeBase: KnowledgeBase;
    tags: Tag[];
    chunks: Chunk[];
    createdAt: Date;
    updatedAt: Date;
    uploadFile?: UploadFile | null;
    uploadFileId?: string | null;
}

// 文档创建参数
export interface CreateDocumentParams {
    name: string;
    content?: string;
    size: number;
    type: string;
    source_type: string;
    thumbnail?: string;
    created_by: string;
    knowledgeBaseId: string;
    parser_id?: string;
    parser_config: any;
    markdown_content?: string;
    summary?: string;
    metadata?: any;
    uploadFileId?: string;
}

// 文档更新参数
export interface UpdateDocumentParams {
    name?: string;
    content?: string;
    status?: DocumentProcessingStatus;
    thumbnail?: string;
    progress?: number;
    progress_msg?: string;
    processing_status?: DocumentProcessingStatus;
    processing_error?: string;
} 