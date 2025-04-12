import { DocumentProcessingStatus } from './enums';


export interface IDocument {
    id: string;
    name: string;
    content?: string;
    size: number;
    type: string;
    source_type: string;
    processing_status: DocumentProcessingStatus;
    thumbnail?: string;
    chunk_num: number;
    token_num: number;
    progress: number;
    progress_msg?: string;
    process_begin_at?: Date;
    process_duation: number;
    create_date: Date;
    create_time: bigint;
    update_date: Date;
    update_time: bigint;
    created_by: string;
    knowledgeBaseId: string;
    parser_id?: string;
    parser_config: Record<string, any>;
    markdown_content?: string;
    summary?: string;
    metadata?: Record<string, any>;
    processing_error?: string;
    uploadFileId?: string;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}



export interface FailedFile {
    name: string;
    error: string;
}



export interface IDocumentMetaRequestBody {
    documentId: string;
    meta: string; // json format string
}
