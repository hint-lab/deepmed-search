import { ModelOptions, ModelProvider, ZeroxOutput, Page as ZeroxPage, ErrorMode } from 'zerox/node-zerox/dist/types';

export interface ZeroxOptions {
    modelProvider?: ModelProvider;
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
    extractPerPage?: string[];
    pagesToConvertAsImages?: number | number[];
    prompt?: string;
    schema?: any;
    errorMode?: ErrorMode;
    maxRetries?: number;
    llmParams?: Record<string, any>;
    apiKey?: string;
}

export interface ZeroxProcessResult {
    success: boolean;
    data?: {
        pages?: any,
        extracted?: any,
        summary?: any,
    },
    error?: string;
    metadata: {
        processingTime: number;
        documentId: string;
        completionTime?: number;
        fileName?: string;
        inputTokens?: number;
        outputTokens?: number;
    };
}

export type { ZeroxOutput, ZeroxPage }; 