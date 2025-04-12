"use client"

import pLimit from 'p-limit';
import { DEFAULT_CONFIG, getDocumentParserApiKey, getDocumentParserUrl } from './config';
import { DocumentParseOptions, DocumentStatus, DocumentUploadResponse } from './types';

// 并发限制器
const limit = pLimit(5); // 限制并发请求数

// 创建文档解析器实例
export function createDocumentParserInstance(config?: { baseUrl?: string; apiKey?: string }) {
    const { DEFAULT_CONFIG } = require('./config');

    return {
        baseUrl: config?.baseUrl || DEFAULT_CONFIG.baseUrl,
        apiKey: config?.apiKey || DEFAULT_CONFIG.apiKey,

        // 上传文档
        uploadDocument: async (file: File, options?: any) => {
            const { uploadDocument } = await import('./operations');
            return uploadDocument(file, options);
        },

        // 获取文档状态
        getDocumentStatus: async (documentId: string) => {
            const { getDocumentStatus } = await import('./operations');
            return getDocumentStatus(documentId);
        },

        // 获取文档内容
        getDocumentContent: async (documentId: string) => {
            const { getDocumentContent } = await import('./operations');
            return getDocumentContent(documentId);
        },

        // 获取文档分块
        getDocumentChunks: async (documentId: string) => {
            const { getDocumentChunks } = await import('./operations');
            return getDocumentChunks(documentId);
        },

        // 转换文档格式
        convertDocument: async (documentId: string, format: string) => {
            const { convertDocument } = await import('./operations');
            return convertDocument(documentId, format);
        },

        // 解析文档
        parseDocument: async (file: File, options?: any, onProgress?: (status: any) => void) => {
            const { parseDocument } = await import('./operations');
            return parseDocument(file, options, onProgress);
        },

        // 生成文档摘要
        summarizeDocument: async (file: File, options?: any, onProgress?: (status: any) => void) => {
            const { summarizeDocument } = await import('./operations');
            return summarizeDocument(file, options, onProgress);
        },
    };
} 