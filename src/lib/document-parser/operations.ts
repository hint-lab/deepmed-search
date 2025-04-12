"use client"

import { DOCUMENT_ENDPOINTS, DOCUMENT_STATUS, getDocumentParserApiKey, getDocumentParserUrl } from './config';
import {
    DocumentChunk,
    DocumentContent,
    DocumentParseOptions,
    DocumentStatus,
    DocumentSummaryOptions,
    DocumentSummaryResponse,
    DocumentUploadResponse
} from './types';
import pLimit from 'p-limit';

// 并发限制器
const limit = pLimit(5); // 限制并发请求数

/**
 * 发送请求到文档处理服务
 * @param endpoint 端点
 * @param method 请求方法
 * @param data 请求数据
 * @param params URL参数
 * @returns 响应数据
 */
export async function sendRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    data?: any,
    params?: Record<string, any>
): Promise<T> {
    const baseUrl = getDocumentParserUrl();
    const apiKey = getDocumentParserApiKey();

    // 替换URL中的参数
    let url = endpoint;
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            url = url.replace(`:${key}`, value);
        });
    }

    const fullUrl = `${baseUrl}${url}`;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const options: RequestInit = {
        method,
        headers,
    };

    if (data) {
        if (data instanceof FormData) {
            // 对于 FormData，不设置 Content-Type，让浏览器自动设置
            options.body = data;
        } else {
            options.body = JSON.stringify(data);
        }
    }

    try {
        const response = await fetch(fullUrl, options);

        if (!response.ok) {
            throw new Error(`文档处理服务响应错误: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`文档处理服务请求失败: ${error.message}`);
        }
        throw error;
    }
}

/**
 * 带重试的文档处理操作执行器
 */
export async function executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;
            console.warn(`文档处理操作失败 (尝试 ${attempt}/${maxRetries}):`, error);

            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    throw lastError;
}

/**
 * 检查文档处理服务是否可用
 */
export async function isDocumentProcessorAvailable(): Promise<boolean> {
    try {
        await executeWithRetry(async () => {
            await sendRequest('/health');
        });
        return true;
    } catch (error) {
        console.error(`  ❌ 检查文档处理服务可用性失败:`, error);
        return false;
    }
}

/**
 * 上传文档并开始处理
 */
export async function uploadDocument(
    file: File,
    options?: DocumentParseOptions
): Promise<{ documentId: string; status: DocumentStatus }> {
    try {
        const formData = new FormData();
        formData.append('file', file);

        if (options) {
            formData.append('options', JSON.stringify(options));
        }

        const response = await limit(() => executeWithRetry(async () => {
            return await sendRequest<{ documentId: string; status: DocumentStatus }>(
                DOCUMENT_ENDPOINTS.UPLOAD,
                'POST',
                formData
            );
        }));

        return response;
    } catch (error) {
        console.error('上传文档失败:', error);
        throw error;
    }
}

/**
 * 获取文档处理状态
 */
export async function getDocumentStatus(documentId: string): Promise<DocumentStatus> {
    try {
        return await limit(() => executeWithRetry(async () => {
            return await sendRequest<DocumentStatus>(
                DOCUMENT_ENDPOINTS.STATUS,
                'GET',
                undefined,
                { documentId }
            );
        }));
    } catch (error) {
        console.error('获取文档状态失败:', error);
        throw error;
    }
}

/**
 * 获取处理后的文档内容
 */
export async function getDocumentContent(documentId: string): Promise<DocumentContent> {
    try {
        return await limit(() => executeWithRetry(async () => {
            return await sendRequest<DocumentContent>(
                DOCUMENT_ENDPOINTS.CONTENT,
                'GET',
                undefined,
                { documentId }
            );
        }));
    } catch (error) {
        console.error('获取文档内容失败:', error);
        throw error;
    }
}

/**
 * 获取文档分块
 */
export async function getDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
    try {
        return await limit(() => executeWithRetry(async () => {
            return await sendRequest<DocumentChunk[]>(
                DOCUMENT_ENDPOINTS.CHUNKS,
                'GET',
                undefined,
                { documentId }
            );
        }));
    } catch (error) {
        console.error('获取文档分块失败:', error);
        throw error;
    }
}

/**
 * 转换文档格式
 */
export async function convertDocument(documentId: string, format: string): Promise<DocumentContent> {
    try {
        return await limit(() => executeWithRetry(async () => {
            return await sendRequest<DocumentContent>(
                DOCUMENT_ENDPOINTS.CONVERT,
                'GET',
                undefined,
                { documentId, format }
            );
        }));
    } catch (error) {
        console.error('转换文档格式失败:', error);
        throw error;
    }
}

/**
 * 解析文档（完整流程）
 */
export async function parseDocument(
    file: File,
    options?: DocumentParseOptions,
    onProgress?: (status: DocumentStatus) => void
): Promise<DocumentContent> {
    try {
        // 上传文档
        const { documentId, status } = await uploadDocument(file, options);

        if (onProgress) {
            onProgress(status);
        }

        // 轮询检查处理状态
        let currentStatus = status;
        while (currentStatus.status === DOCUMENT_STATUS.PENDING || currentStatus.status === DOCUMENT_STATUS.PROCESSING) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // 每2秒检查一次
            currentStatus = await getDocumentStatus(documentId);

            if (onProgress) {
                onProgress(currentStatus);
            }
        }

        // 检查处理结果
        if (currentStatus.status === DOCUMENT_STATUS.FAILED) {
            throw new Error(`文档处理失败: ${currentStatus.error}`);
        }

        // 获取处理后的文档内容
        return await getDocumentContent(documentId);
    } catch (error) {
        console.error('解析文档失败:', error);
        throw error;
    }
}

/**
 * 生成文档摘要
 */
export async function summarizeDocument(
    file: File,
    options?: DocumentSummaryOptions,
    onProgress?: (status: DocumentStatus) => void
): Promise<DocumentSummaryResponse> {
    try {
        // 上传文档
        const { documentId, status } = await uploadDocument(file, {
            ...options,
            prompt: `请生成一个${options?.format === 'bullet' ? '要点列表' : '段落'}形式的文档摘要，长度不超过${options?.maxLength || 500}字。`,
        });

        if (onProgress) {
            onProgress(status);
        }

        // 轮询检查处理状态
        let currentStatus = status;
        while (currentStatus.status === DOCUMENT_STATUS.PENDING || currentStatus.status === DOCUMENT_STATUS.PROCESSING) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // 每2秒检查一次
            currentStatus = await getDocumentStatus(documentId);

            if (onProgress) {
                onProgress(currentStatus);
            }
        }

        // 检查处理结果
        if (currentStatus.status === DOCUMENT_STATUS.FAILED) {
            throw new Error(`文档摘要生成失败: ${currentStatus.error}`);
        }

        // 获取处理后的文档内容
        const content = await getDocumentContent(documentId);

        return {
            summary: content.content,
            metadata: content.metadata,
            format: options?.format || 'paragraph',
        };
    } catch (error) {
        console.error('生成文档摘要失败:', error);
        throw error;
    }
}

// 导出并发限制器供其他模块使用
export { limit }; 