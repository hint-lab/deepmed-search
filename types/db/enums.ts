// 文档处理状态枚举
export enum DocumentProcessingStatus {
    UNPROCESSED = 'UNPROCESSED',
    PROCESSING = 'PROCESSING',
    PROCESSED = 'PROCESSED',
    FAILED = 'FAILED'
}

// 文件上传状态枚举
export enum FileUploadStatus {
    PENDING = 'PENDING',
    UPLOADING = 'UPLOADING',
    UPLOADED = 'UPLOADED',
    FAILED = 'FAILED'
} 