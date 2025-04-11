export type DocumentType = 'pdf' | 'docx' | 'doc' | 'txt' | 'md';
export interface ProcessResult {
    success: boolean;
    documentId: string;
    content?: string;
    error?: string;
    metadata: {
        pageCount?: number;
        wordCount?: number;
        processingTime?: number;
    };
}
export interface DocumentChunk {
    id: string;
    content: string;
    index: number;
}
export interface UploadedFile {
    name: string;
    data: Buffer;
    size: number;
    type: string;
}
/**
 * Get file type
 */
export declare function getFileType(filePath: string): DocumentType;
/**
 * Save uploaded file
 */
export declare function saveUploadedFile(file: UploadedFile, documentId: string): Promise<string>;
/**
 * Process PDF file
 */
export declare function processPdfFile(filePath: string): Promise<ProcessResult>;
/**
 * Process Word file
 */
export declare function processWordFile(filePath: string): Promise<ProcessResult>;
/**
 * Process text file
 */
export declare function processTextFile(filePath: string): Promise<ProcessResult>;
/**
 * Process document and convert to Markdown
 */
export declare function processDocumentToMarkdown(filePath: string): Promise<ProcessResult>;
/**
 * Split document into chunks
 */
export declare function chunkDocument(content: string, maxChunkSize?: number): string[];
/**
 * Save processed document
 */
export declare function saveProcessedDocument(documentId: string, content: string): Promise<string>;
/**
 * Save document chunks
 */
export declare function saveDocumentChunks(documentId: string, chunks: string[]): Promise<void>;
/**
 * Find original files
 */
export declare function findOriginalFiles(documentId: string): Promise<string[]>;
/**
 * Find processed file
 */
export declare function findProcessedFile(documentId: string): Promise<string | null>;
/**
 * Get processed document content
 */
export declare function getProcessedDocumentContent(documentId: string): Promise<string | null>;
/**
 * Find document chunks
 */
export declare function findDocumentChunks(documentId: string): Promise<DocumentChunk[]>;
