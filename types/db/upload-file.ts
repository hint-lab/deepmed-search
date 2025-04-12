import { FileUploadStatus } from './enums';
import { Document } from './document';

// 上传文件模型类型定义
export interface UploadFile {
    id: string;
    name: string;
    location: string;
    size: number;
    type: string;
    thumbnail?: string | null;
    status: FileUploadStatus;
    upload_progress: number;
    error_message?: string | null;
    create_date: Date;
    create_time: bigint;
    created_by: string;
    parser_id?: string | null;
    parser_config: any;
    summary?: string | null;
    metadata?: any | null;
    createdAt: Date;
    updatedAt: Date;
    document?: Document | null;
}

// 上传文件创建参数
export interface CreateUploadFileParams {
    name: string;
    location: string;
    size: number;
    type: string;
    thumbnail?: string;
    created_by: string;
    parser_id?: string;
    parser_config: any;
    summary?: string;
    metadata?: any;
}

// 上传文件更新参数
export interface UpdateUploadFileParams {
    status?: FileUploadStatus;
    upload_progress?: number;
    error_message?: string;
    thumbnail?: string;
    summary?: string;
    metadata?: any;
} 