import { DocumentParserConfig } from './types';

// 文档处理服务配置
export const DEFAULT_CONFIG = {
    baseUrl: process.env.NEXT_PUBLIC_DOCUMENT_PARSER_URL || 'http://localhost:3000',
    apiKey: process.env.NEXT_PUBLIC_DOCUMENT_PARSER_API_KEY,
};

// 文档处理端点
export const DOCUMENT_ENDPOINTS = {
    UPLOAD: '/api/documents/upload',
    STATUS: '/api/documents/:documentId/status',
    CONTENT: '/api/documents/:documentId/content',
    CHUNKS: '/api/documents/:documentId/chunks',
    CONVERT: '/api/documents/:documentId/convert',
} as const;

// 文档处理状态
export const DOCUMENT_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
} as const;

// 文档格式
export const DOCUMENT_FORMATS = {
    MARKDOWN: 'markdown',
    HTML: 'html',
    TEXT: 'text',
    PDF: 'pdf',
} as const;

/**
 * 获取文档处理服务URL
 */
export function getDocumentParserUrl(): string {
    return process.env.NEXT_PUBLIC_DOCUMENT_PARSER_URL || DEFAULT_CONFIG.baseUrl;
}

/**
 * 获取文档处理服务API密钥
 */
export function getDocumentParserApiKey(): string | undefined {
    return process.env.NEXT_PUBLIC_DOCUMENT_PARSER_API_KEY || DEFAULT_CONFIG.apiKey;
} 