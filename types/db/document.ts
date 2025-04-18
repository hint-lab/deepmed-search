import { DocumentProcessingStatus } from './enums';
import { KnowledgeBase } from './knowledge-base';
import { Tag } from './tag';
import { Chunk } from './chunk';
import { UploadFile } from './upload-file';

// 文档模型类型定义
export interface IDocument {
    id: string;
    name: string;
    content_url: string;
    file_url: string;
    size: number;
    type: string;
    source_type: string;
    processing_status: DocumentProcessingStatus;
    thumbnail: string;
    chunk_num: number;
    token_num: number;
    progress: number;
    progress_msg: string;
    process_begin_at: Date;
    process_duation: number;
    create_date: Date;
    create_time: number;
    update_date: Date;
    update_time: number;
    created_by: string;
    knowledgeBaseId: string;
    parser_id: string;
    parser_config: any;
    markdown_content: string;
    summary: string;
    metadata: any;
    processing_error: string;
    enabled: boolean;
    knowledgeBase: KnowledgeBase;
    tags: Tag[];
    chunks: Chunk[];
    uploadFile: UploadFile;
    uploadFileId: string;
}

// 文档创建参数
export interface CreateIDocumentParams {
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
export interface UpdateIDocumentParams {
    name?: string;
    content?: string;
    status?: DocumentProcessingStatus;
    thumbnail?: string;
    progress?: number;
    progress_msg?: string;
    processing_status?: DocumentProcessingStatus;
    processing_error?: string;
} 