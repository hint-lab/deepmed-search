'use server';

import { prisma } from '../lib/prisma';
import { ChunkIndexer } from '@/lib/chunk-indexer';
import { DocumentSplitter } from '@/lib/document-splitter';
import logger from '@/utils/logger';
import { DocumentChunk } from '@/lib/document-splitter';
import { ServerActionResponse } from '@/types/actions';
import { processDocument } from '@/lib/bullmq/document-worker';
import { uploadFileStream, getFileUrl } from '@/lib/minio/operations';
import { DocumentProcessJobResult } from '@/lib/bullmq/document-worker/types';
import { IDocumentProcessingStatus } from '@/types/enums';


// 直接处理文档的server action
export async function processDocumentDirectlyAction(
    documentId: string,
    kbId: string,
    options: {
        model: string;
        maintainFormat: boolean;
        prompt?: string;
        chunkSize?: number;
    }
): Promise<ServerActionResponse<any>> {
    try {
        // 1. 转换文档
        // 更新文档状态为处理中
        const converted = await convertDocumentAction(documentId, {
            model: options.model,
            maintainFormat: options.maintainFormat,
            prompt: options.prompt
        });

        if (!converted.success) {
            return {
                success: false,
                error: converted.error || '文档转换失败'
            };
        }

        // 2. 分割文档
        const pages = converted.data?.data?.pages || [];
        const documentName = converted.data?.metadata?.fileName || '未知文档';

        const split = await splitDocumentAction(
            documentId,
            pages,
            {
                model: options.model,
                maintainFormat: options.maintainFormat,
                prompt: options.prompt,
                documentName
            }
        );

        if (!split.success || !split.data) {
            return {
                success: false,
                error: split.error || '文档分割失败'
            };
        }

        // 3. 索引文档块
        const index = await indexDocumentChunksAction(
            documentId,
            kbId,
            split.data.chunks
        );

        if (!index.success) {
            return {
                success: false,
                error: index.error || '文档索引失败'
            };
        }

        // 返回成功结果
        return {
            success: true,
            data: {
                documentId,
                converted: converted.data,
                split: split.data,
                index: index.data
            }
        };
    } catch (error: any) {
        logger.error('直接处理文档失败', {
            documentId,
            error: error instanceof Error ? error.message : '未知错误'
        });

        return {
            success: false,
            error: error.message || '直接处理文档失败'
        };
    }
}

// 文档转换的server action
export async function convertDocumentAction(
    documentId: string,
    options: {
        model: string;
        maintainFormat: boolean;
        prompt?: string;
    }
): Promise<ServerActionResponse<any>> {
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
        const result: DocumentProcessJobResult = await processDocument({
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
        console.log('DocumentProcessJobResult', result);
        if (!result.success) {
            return {
                success: false,
                error: result.error || '处理文档失败'
            };
        }
        // 提取Markdown内容
        const markdown_content = result.data?.pages?.map((page: { content: string }) => page.content).join('\n\n') || '';

        // 将完整结果保存为字符串
        const rawData = result.data ? JSON.stringify(result.data) : '{}';

        // 将Markdown内容上传到MinIO，获取URL
        let content_url = null;
        // 如果markdown_content不为空，则上传到MinIO
        console.log('markdown_content', markdown_content);
        if (markdown_content) {
            try {
                // 创建一个 Readable 流
                const { Readable } = require('stream');
                const buffer = Buffer.from(markdown_content, 'utf8');
                const stream = new Readable();
                stream.push(buffer);
                stream.push(null);

                const objectName = `documents/${documentId}/markdown`;
                await uploadFileStream({
                    bucketName: 'deepmed',
                    objectName,
                    stream,
                    size: buffer.length,
                    metaData: {
                        'content-type': 'text/markdown; charset=utf-8'
                    }
                });

                // 获取文件 URL
                content_url = await getFileUrl('deepmed', objectName);
                console.log('Markdown内容已上传至MinIO:', content_url);
            } catch (error) {
                console.error('上传Markdown内容到MinIO失败:', error);
            }
        }

        // 更新文档处理状态
        try {
            await prisma.document.update({
                where: { id: documentId },
                data: {
                    markdown_content: markdown_content, // 如果上传成功，就不存在数据库里
                    chunk_num: 0,
                    token_num: result.metadata?.inputTokens || 0,
                    processing_status: IDocumentProcessingStatus.CONVERTING,
                    progress: 60,
                    progress_msg: '转换完成',
                    process_duation: Math.floor((Date.now() - startTime) / 1000),
                    process_begin_at: new Date(startTime),
                    file_url: result.metadata?.fileUrl || '',
                    content_url: content_url || '',
                    metadata: {
                        processingTime: Date.now() - startTime,
                        completionTime: result.metadata?.completionTime || 0,
                        documentId,
                        pageCount: result.data?.pages?.length || 0,
                    }

                }
            });
            console.log('文档更新成功:', documentId);
        } catch (error) {
            console.error('更新文档失败:', error);
            throw new Error(`更新文档失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }

        // 返回处理结果
        return {
            success: true,
            data: {
                success: true,
                data: {
                    pageCount: result.data?.pages?.length,
                    pages: result.data?.pages,
                },
                metadata: {
                    processingTime: Date.now() - startTime,
                    documentId,
                    completionTime: result.metadata?.completionTime,
                    fileName: result.metadata?.fileName,
                    inputTokens: result.metadata?.inputTokens,
                    outputTokens: result.metadata?.outputTokens,
                    fileUrl: result.metadata?.fileUrl,
                    contentUrl: content_url || '',
                }
            }
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
        maxChunkSize?: number;
        overlapSize?: number;
        splitByParagraph?: boolean;
    }
): Promise<ServerActionResponse<{ chunks: DocumentChunk[]; totalChunks: number }>> {
    try {
        logger.info('开始文档分割', {
            documentId,
            pageCount: pages.length
        });

        // 创建文档分割器
        const splitter = new DocumentSplitter({
            maxChunkSize: options.maxChunkSize || 1000,
            overlapSize: options.overlapSize || 100,
            splitByParagraph: options.splitByParagraph || false,
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
    kbId: string,
    chunks: DocumentChunk[]
): Promise<ServerActionResponse<{ indexedCount: number; embeddings?: number[][] }>> {
    try {
        logger.info('开始索引文档块', {
            documentId,
            chunkCount: chunks.length,
            kbId
        });

        if (!kbId) {
            logger.error('indexDocumentChunksAction 收到无效的 kbId', { documentId, receivedKbId: kbId });
            return { success: false, error: `内部错误：传递给索引操作的知识库 ID 无效 (received: ${kbId})` };
        }
        await prisma.document.update({
            where: { id: documentId },
            data: {
                chunk_num: chunks.length,
                processing_status: IDocumentProcessingStatus.INDEXING, progress: 70
            }
        });
        const indexer = new ChunkIndexer({
            embeddingModel: 'text-embedding-3-small',
            batchSize: 10,
            kbId: kbId
        });

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

        await prisma.document.update({
            where: { id: documentId },
            data: {
                chunk_num: chunks.length,
                processing_status: IDocumentProcessingStatus.SUCCESSED,
                progress: 100
            }
        });

        return {
            success: true,
            data: {
                indexedCount: indexResult.indexedCount,
                embeddings: indexResult.embeddings
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
        const startTime = Date.now();

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



        // 开始处理文档
        const result = await processDocumentDirectlyAction(documentId, document.knowledgeBaseId, options);

        if (!result.success) {
            // 更新文档状态为处理失败
            await prisma.document.update({
                where: { id: documentId },
                data: {
                    processing_status: IDocumentProcessingStatus.FAILED,
                    progress: 0,
                    progress_msg: result.error || '处理失败',
                    process_duation: Math.floor((Date.now() - startTime) / 1000),
                    processing_error: result.error
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
                processing_status: {
                    set: IDocumentProcessingStatus.FAILED
                },
                progress: 0,
                progress_msg: error.message || '处理失败',
                processing_error: error.message
            }
        });

        return {
            success: false,
            error: error.message || '处理文档失败'
        };
    }
}

// 更新文档处理状态的server action
export async function updateDocumentProcessingStatusAction(
    documentId: string,
    status: IDocumentProcessingStatus,
    options?: {
        progress?: number;
        progressMsg?: string;
        error?: string;
    }
): Promise<ServerActionResponse<{ success: boolean }>> {
    try {
        await prisma.document.update({
            where: { id: documentId },
            data: {
                processing_status: {
                    set: status
                },
                progress: options?.progress ?? 0,
                progress_msg: options?.progressMsg || '',
                processing_error: options?.error || null,
                ...(status === IDocumentProcessingStatus.CONVERTING && {
                    process_begin_at: new Date()
                })
            }
        });

        return {
            success: true,
            data: {
                success: true
            }
        };
    } catch (error: any) {
        logger.error('更新文档处理状态失败', {
            documentId,
            status,
            error: error instanceof Error ? error.message : '未知错误'
        });

        return {
            success: false,
            error: error.message || '更新文档处理状态失败'
        };
    }
}

/**
 * 获取文档所属的知识库 ID
 * @param documentId 文档 ID
 * @returns 包含知识库 ID 或错误的响应
 */
export async function getDocumentKnowledgeBaseIdAction(
    documentId: string
): Promise<{ success: boolean; kbId?: string; error?: string }> {
    if (!documentId) {
        return { success: false, error: '文档 ID 不能为空' };
    }
    try {
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            select: { knowledgeBaseId: true },
        });

        if (!document) {
            return { success: false, error: `找不到文档: ${documentId}` };
        }

        if (document.knowledgeBaseId === null) {
            return { success: false, error: `文档 ${documentId} 的 knowledgeBaseId 为 null` };
        }

        return { success: true, kbId: document.knowledgeBaseId };
    } catch (error: any) {
        console.error(`获取文档 ${documentId} 的知识库 ID 失败:`, error, {});
        return { success: false, error: error.message || '获取知识库 ID 时发生未知错误' };
    }
}

/**
 * 获取单个文档的状态信息
 * @param documentId - 文档ID
 * @returns 文档状态信息或错误
 */
export async function getDocumentStatusAction(documentId: string): Promise<ServerActionResponse<{ processing_status: IDocumentProcessingStatus, progress_msg?: string | null }>> {
    try {
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            select: {
                processing_status: true,
                progress_msg: true
            }
        });

        if (!document) {
            return { success: false, error: '文档不存在' };
        }

        return {
            success: true, data: {
                processing_status: document.processing_status as IDocumentProcessingStatus,
                progress_msg: document.progress_msg
            }
        };

    } catch (error) {
        console.error(`获取文档 ${documentId} 状态失败:`, error);
        return { success: false, error: '获取文档状态失败' };
    }
} 