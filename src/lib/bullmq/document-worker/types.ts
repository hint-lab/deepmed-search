// This file defines types and interfaces for the BullMQ document processing worker.
import { ProcessJobResult } from '../types';

export interface DocumentProcessJobResult extends ProcessJobResult {
    success: boolean;
    data?: {
        pages?: Array<{
            content: string;
            contentLength: number;
        }>;
        summary?: {
            totalPages: number;
            ocr: {
                successful: number;
                failed: number;
            };
            extracted: any;
        };
        extracted?: any;
    };
    metadata?: {
        fileName?: string;
        processingTime?: number;
        completionTime?: number;
        documentId?: string;
        inputTokens?: number;
        outputTokens?: number;
        fileUrl?: string;
    };
    error?: string;
}

export interface DocumentProcessJobData {
    documentId: string;
    userId: string; // 用户ID（必需：用于获取用户配置的文档解析器和 API keys）
    documentInfo: {
        name: string;
        uploadFile: {
            location: string;
        };
    };
    options: {
        model: string;
        maintainFormat: boolean;
        prompt?: string;
    }
}