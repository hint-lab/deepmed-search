/**
 * 分块向量索引任务数据
 */
export interface ChunkIndexJobData {
    documentId: string;
    kbId: string;
    userId: string;
    options: {
        model: string;
        maintainFormat: boolean;
        prompt?: string;
        documentName: string;
        maxChunkSize?: number;
        overlapSize?: number;
        splitByParagraph?: boolean;
        language?: string;
    };
}

/**
 * 分块向量索引任务结果
 */
export interface ChunkIndexJobResult {
    success: boolean;
    indexedCount?: number;
    totalChunks?: number;
    error?: string;
}

