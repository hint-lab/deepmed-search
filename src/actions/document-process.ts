'use server';

import { prisma } from '@/lib/prisma';
import { ChunkIndexer } from '@/lib/chunk-indexer';
import { DocumentSplitter } from '@/lib/document-splitter';
import logger from '@/utils/logger';
import { DocumentChunk } from '@/lib/document-splitter';
import { DocumentProcessingStatus } from '@/types/db/enums';
import { ServerActionResponse } from '@/types/actions';
import { ProcessResult } from '@/lib/zerox/types';
import { processDocument } from '@/lib/bullmq/document-worker';

interface Page {
    pageNumber: number;
    content: string;
    contentLength?: number;
}

// 直接处理文档的server action
export async function processDocumentDirectlyAction(
    documentId: string,
    options: {
        model: string;
        maintainFormat: boolean;
        prompt?: string;
    }
): Promise<ServerActionResponse<ProcessResult>> {
    const startTime = Date.now();

    try {
        // 获取文档信息
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            include: {
                uploadFile: true
            }
        });

        if (!document) {
            return {
                success: false,
                error: '文档不存在'
            };
        }

        if (!document.uploadFile) {
            return {
                success: false,
                error: '文档文件不存在'
            };
        }

        // 调用文档处理函数
        const result = await processDocument({
            documentId,
            documentInfo: {
                name: document.name,
                uploadFile: {
                    location: document.uploadFile.location
                }
            },
            options: {
                model: options.model,
                maintainFormat: options.maintainFormat,
                prompt: options.prompt
            }
        });
        console.log('result', result);
        if (!result.success) {
            return {
                success: false,
                error: result.error || '处理文档失败'
            };
        }

        // 更新文档处理状态
        const markdown_content = result.data?.data?.metadata?.pages?.map((page: { content: string }) => page.content).join('\n\n') || '';
        await prisma.document.update({
            where: { id: documentId },
            data: {
                markdown_content,
                chunk_num: result.data?.totalChunks || 0,
                processing_status: DocumentProcessingStatus.PROCESSED,
                progress: 100,
                progress_msg: '处理完成',
                process_duation: Math.floor((Date.now() - startTime) / 1000),
                metadata: {
                    processingTime: Date.now() - startTime,
                    documentId
                }
            }
        });

        // 返回处理结果
        return {
            success: true,
            data: result.data?.data
        };
    } catch (error: any) {
        console.error('处理文档失败:', error);
        return {
            success: false,
            error: error.message || '处理文档失败'
        };
    }
}

// 文档分块的server action
export async function splitDocumentAction(
    documentId: string,
    pages: Array<{ pageNumber: number; content: string }>,
    options: {
        model: string;
        maintainFormat: boolean;
        prompt?: string;
        documentName: string;
    }
): Promise<ServerActionResponse<{ chunks: DocumentChunk[]; totalChunks: number }>> {
    try {
        logger.info('开始文档分割', {
            documentId,
            pageCount: pages.length
        });

        // 创建文档分割器
        const splitter = new DocumentSplitter({
            maxChunkSize: 1000,
            overlapSize: 100,
            splitByParagraph: true,
            preserveFormat: options.maintainFormat
        });

        // 处理每个页面
        const allChunks = [];
        let totalChunks = 0;

        for (const page of pages) {
            // 分割页面内容
            const chunks = splitter.splitDocument(page.content, {
                documentId,
                documentName: options.documentName,
                pageNumber: page.pageNumber,
                model: options.model,
                maintainFormat: options.maintainFormat,
                prompt: options.prompt
            });

            totalChunks += chunks.length;
            allChunks.push(...chunks);
        }

        logger.info('文档分割完成', {
            documentId,
            totalChunks
        });

        return {
            success: true,
            data: {
                chunks: allChunks,
                totalChunks
            }
        };
    } catch (error: any) {
        logger.error('文档分割失败', {
            documentId,
            error: error instanceof Error ? error.message : '未知错误'
        });

        return {
            success: false,
            error: error.message || '文档分割失败'
        };
    }
}

// 文档块索引的server action
export async function indexDocumentChunksAction(
    documentId: string,
    chunks: DocumentChunk[]
): Promise<ServerActionResponse<{ indexedCount: number }>> {
    try {
        logger.info('开始索引文档块', {
            documentId,
            chunkCount: chunks.length
        });

        // 创建块索引器
        const indexer = new ChunkIndexer({
            embeddingModel: 'text-embedding-3-small',
            collectionName: 'chunks',
            batchSize: 10
        });

        // 索引文档块
        const indexResult = await indexer.indexChunks(chunks);

        if (!indexResult.success) {
            logger.error('索引文档块失败', {
                documentId,
                error: indexResult.error
            });

            return {
                success: false,
                error: indexResult.error || '索引文档块失败'
            };
        }

        logger.info('文档块索引完成', {
            documentId,
            indexedCount: indexResult.indexedCount
        });

        // 更新文档的 chunk_num
        await prisma.document.update({
            where: { id: documentId },
            data: {
                chunk_num: chunks.length,
                processing_status: DocumentProcessingStatus.PROCESSED
            }
        });

        return {
            success: true,
            data: {
                indexedCount: indexResult.indexedCount
            }
        };
    } catch (error: any) {
        logger.error('索引文档块失败', {
            documentId,
            error: error instanceof Error ? error.message : '未知错误'
        });

        return {
            success: false,
            error: error.message || '索引文档块失败'
        };
    }
}

// 使用队列处理文档的server action
export async function processDocumentActionUsingQueue(
    documentId: string,
    options: {
        model: string;
        maintainFormat: boolean;
        prompt?: string;
    }
): Promise<ServerActionResponse<{ success: boolean }>> {
    try {
        // 获取文档信息
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            include: {
                uploadFile: true
            }
        });

        if (!document) {
            return {
                success: false,
                error: '文档不存在'
            };
        }

        if (!document.uploadFile) {
            return {
                success: false,
                error: '文档文件不存在'
            };
        }

        // 更新文档状态为处理中
        await prisma.document.update({
            where: { id: documentId },
            data: {
                processing_status: DocumentProcessingStatus.PROCESSING,
                progress: 0,
                progress_msg: '开始处理'
            }
        });

        // 开始处理文档
        const result = await processDocumentDirectlyAction(documentId, options);

        if (!result.success) {
            // 更新文档状态为处理失败
            await prisma.document.update({
                where: { id: documentId },
                data: {
                    processing_status: DocumentProcessingStatus.FAILED,
                    progress: 0,
                    progress_msg: result.error || '处理失败'
                }
            });

            return {
                success: false,
                error: result.error
            };
        }

        return {
            success: true,
            data: {
                success: true
            }
        };
    } catch (error: any) {
        console.error('处理文档失败:', error);

        // 更新文档状态为处理失败
        await prisma.document.update({
            where: { id: documentId },
            data: {
                processing_status: DocumentProcessingStatus.FAILED,
                progress: 0,
                progress_msg: error.message || '处理失败'
            }
        });

        return {
            success: false,
            error: error.message || '处理文档失败'
        };
    }
} 