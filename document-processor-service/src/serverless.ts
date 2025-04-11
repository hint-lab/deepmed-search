import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import * as documentProcessor from './services/document-processor';
import logger from './utils/logger';
import fs from 'fs/promises';
import { UploadRequestBody } from './types';

// 处理文档上传
export async function handleDocumentUpload(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        if (!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    error: 'No request body provided'
                })
            };
        }

        const { documentId = uuidv4() } = JSON.parse(event.body) as UploadRequestBody;

        // 从请求中获取文件内容
        const fileContent = event.body;
        const fileName = event.headers['x-file-name'] || 'document';
        const fileType = event.headers['x-file-type'] || 'application/octet-stream';

        // 保存上传的文件
        const filePath = await documentProcessor.saveUploadedFile({
            name: fileName,
            data: Buffer.from(fileContent),
            size: fileContent.length,
            type: fileType
        }, documentId);

        // 处理文档
        const result = await documentProcessor.processDocumentToMarkdown(filePath);

        if (result.success && result.content) {
            // 保存处理后的文档
            await documentProcessor.saveProcessedDocument(documentId, result.content);

            // 分块处理
            const chunks = documentProcessor.chunkDocument(result.content);
            await documentProcessor.saveDocumentChunks(documentId, chunks);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    documentId,
                    metadata: result.metadata,
                    chunkCount: chunks.length
                })
            };
        } else {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    success: false,
                    documentId,
                    error: result.error || 'Document processing failed'
                })
            };
        }
    } catch (error) {
        logger.error('Document processing failed', { error });

        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Document processing failed'
            })
        };
    }
}

// 获取文档状态
export async function handleDocumentStatus(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const documentId = event.pathParameters?.documentId;

        if (!documentId) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    error: 'Document ID is required'
                })
            };
        }

        // 检查文件状态
        const originalFiles = await documentProcessor.findOriginalFiles(documentId);
        const processedFile = await documentProcessor.findProcessedFile(documentId);
        const chunks = await documentProcessor.findDocumentChunks(documentId);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                documentId,
                status: {
                    originalFile: originalFiles.length > 0,
                    processedFile: !!processedFile,
                    chunks: chunks.length > 0,
                    chunkCount: chunks.length
                }
            })
        };
    } catch (error) {
        logger.error('Failed to get document status', { error });

        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get document status'
            })
        };
    }
}

// 获取文档内容
export async function handleDocumentContent(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const documentId = event.pathParameters?.documentId;

        if (!documentId) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    error: 'Document ID is required'
                })
            };
        }

        // 获取处理后的文档内容
        const content = await documentProcessor.getProcessedDocumentContent(documentId);

        if (content) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    documentId,
                    content
                })
            };
        } else {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    error: 'Document does not exist or processing is not complete'
                })
            };
        }
    } catch (error) {
        logger.error('Failed to get document content', { error });

        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get document content'
            })
        };
    }
}

// 获取文档分块
export async function handleDocumentChunks(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const documentId = event.pathParameters?.documentId;

        if (!documentId) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    error: 'Document ID is required'
                })
            };
        }

        // 获取文档分块
        const chunks = await documentProcessor.findDocumentChunks(documentId);

        if (chunks.length > 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    documentId,
                    chunks: chunks.map(chunk => ({
                        id: chunk.id,
                        content: chunk.content,
                        index: chunk.index
                    }))
                })
            };
        } else {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    error: 'Document chunks do not exist or processing is not complete'
                })
            };
        }
    } catch (error) {
        logger.error('Failed to get document chunks', { error });

        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get document chunks'
            })
        };
    }
} 