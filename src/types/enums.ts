// 文档处理状态枚举
export enum IDocumentProcessingStatus {
    UNPROCESSED = 'UNPROCESSED',
    CONVERTING = 'CONVERTING',
    CONVERTED = 'CONVERTED',
    INDEXING = 'INDEXING',
    SUCCESSED = 'SUCCESSED',
    FAILED = 'FAILED'
}

export enum IFileUploadStatus {
    UNPROCESSED = 'UNPROCESSED',
    PROCESSING = 'PROCESSING',
    SUCCESSED = 'SUCCESSED',
    FAILED = 'FAILED'
}