// This file defines types and interfaces for the BullMQ document processing worker.

import { ProcessResult } from '../../zerox/types';
import { DocumentChunk } from '../../document-splitter';

export const JOB_OPTIONS = {
    attempts: 3,
    backoff: {
        type: 'exponential',
        delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
} as const;


export interface DocumentProcessJobResult {
    success: boolean;
    data?: {
        success: boolean;
        data?: ProcessResult;
        error?: string;
        fileUrl?: string;
        totalChunks?: number;
        pages?: {
            pageNumber: number;
            content: string;
            contentLength: number;
        }[];
    };
    error?: string;
}

export interface DocumentProcessJobData {
    documentId: string;
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