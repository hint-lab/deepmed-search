import { IFileUploadStatus } from './enums';
import { IDocument } from './document';

// 上传文件模型类型定义
export interface IUploadFile {
    id: string;
    name: string;
    location: string;
    size: number;
    type: string;
    thumbnail?: string | null;
    status: IFileUploadStatus;
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
export interface CreateIUploadFileParams {
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
export interface UpdateIUploadFileParams {
    status?: IFileUploadStatus;
    upload_progress?: number;
    error_message?: string;
    thumbnail?: string;
    summary?: string;
    metadata?: any;
} 