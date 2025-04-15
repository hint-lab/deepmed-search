// This file defines types and interfaces for the BullMQ document processing worker.




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
    data?: any;
    error?: string;
}

export interface DocumentProcessJobData {
    documentId: string;
    options: {
        model: string;
        maintainFormat: boolean;
        prompt?: string;
    }
}