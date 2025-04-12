import { Readable } from 'stream';

// MinIO 配置类型
export interface MinioConfig {
    endPoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
    maxConnections: number;
    maxRetries: number;
    retryDelay: number;
    timeout: number;
}

// MinIO 服务器状态类型
export interface MinioServerStatus {
    status: 'healthy' | 'unhealthy';
    version: string;
    uptime: number;
    buckets: MinioBucketInfo[];
    totalSize: number;
    totalObjects: number;
}

// 存储桶信息类型
export interface MinioBucketInfo {
    name: string;
    size: number;
    objects: number;
    lastModified: string;
    folders: {
        path: string;
        size: number;
        subfolders: number;
        files: number;
    }[];
}

// 文件上传参数类型
export interface FileUploadParams {
    bucketName: string;
    objectName: string;
    stream: Readable;
    size: number;
    metaData?: Record<string, string>;
}

// 预签名 URL 参数类型
export interface PresignedUrlParams {
    bucketName: string;
    objectName: string;
    expirySeconds?: number;
    download?: boolean;
}

// MIME 类型映射
export const MIME_TYPES: Record<string, string> = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'txt': 'text/plain; charset=utf-8',
    'md': 'text/markdown; charset=utf-8',
    'markdown': 'text/markdown; charset=utf-8',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif'
} as const; 