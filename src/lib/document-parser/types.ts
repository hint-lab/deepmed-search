// 文档解析配置接口
export interface DocumentParserConfig {
    baseUrl: string;
    apiKey?: string;
}

// 文档解析选项接口
export interface DocumentParseOptions {
    model?: string;
    outputDir?: string;
    maintainFormat?: boolean;
    cleanup?: boolean;
    concurrency?: number;
    tempDir?: string;
    maxImageSize?: number;
    imageDensity?: number;
    imageHeight?: number;
    maxTesseractWorkers?: number;
    correctOrientation?: boolean;
    trimEdges?: boolean;
    directImageExtraction?: boolean;
    extractionPrompt?: string;
    extractOnly?: boolean;
    extractPerPage?: boolean;
    pagesToConvertAsImages?: number | number[];
    prompt?: string;
    schema?: any;
}

// 文档摘要选项接口
export interface DocumentSummaryOptions {
    model?: string;
    maxLength?: number;
    format?: 'bullet' | 'paragraph';
}

// 文档处理状态接口
export interface DocumentStatus {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    error?: string;
    result?: any;
}

// 文档内容接口
export interface DocumentContent {
    content: string;
    metadata: {
        completionTime?: number;
        fileName?: string;
        inputTokens?: number;
        outputTokens?: number;
        pages?: Array<{
            pageNumber: number;
            content: string;
            contentLength: number;
        }>;
    };
}

// 文档分块接口
export interface DocumentChunk {
    chunk_id: string;
    content_with_weight: string;
    doc_id: string;
    doc_name: string;
    kb_id: string;
    important_kwd: string[];
    question_kwd: string[];
    tag_kwd: string[];
    positions: {
        start: number;
        end: number;
    };
}

// 文档上传响应接口
export interface DocumentUploadResponse {
    documentId: string;
    status: DocumentStatus;
}

// 文档摘要响应接口
export interface DocumentSummaryResponse {
    summary: string;
    metadata: any;
    format: string;
} 