import { AppContext } from '../types';
/**
 * Upload and process document
 */
export declare function uploadDocument(ctx: AppContext): Promise<void>;
/**
 * Get document processing status
 */
export declare function getDocumentStatus(ctx: AppContext): Promise<void>;
/**
 * Get processed document content
 */
export declare function getDocumentContent(ctx: AppContext): Promise<void>;
/**
 * Get document chunks
 */
export declare function getDocumentChunks(ctx: AppContext): Promise<void>;
