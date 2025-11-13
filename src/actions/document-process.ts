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
import { userDocumentContextStorage, UserDocumentContext } from '@/lib/document-parser/user-context';
import { decryptApiKey } from '@/lib/crypto';
import { normalizeLanguage } from '@/constants/language';
import {
    updateDocumentProgress,
    updateDocumentStatus,
    reportDocumentError,
    reportDocumentComplete
} from '@/lib/document-tracker';


/**
 * @deprecated 已废弃 - 请使用 processDocumentAction（队列模式）
 * 直接同步处理文档（仅用于测试，生产环境请使用队列模式）
 */
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
    // 已废弃：请使用 processDocumentAction 代替
    throw new Error('processDocumentDirectlyAction 已废弃。请使用 processDocumentAction（队列模式）。');

    /* 原实现已注释，保留供参考
export async function processDocumentDirectlyAction_OLD(
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
        // 获取知识库配置，用于分块参数
        const knowledgeBase = await prisma.knowledgeBase.findUnique({
            where: { id: kbId },
            select: {
                chunk_size: true,
                overlap_size: true,
                split_by: true
            }
        });

        // 使用知识库配置的分块大小，如果没有则使用传入的chunkSize，最后使用默认值2000（增大默认值）
        const maxChunkSize = options.chunkSize || knowledgeBase?.chunk_size || 2000;
        const overlapSize = knowledgeBase?.overlap_size || 200;
        const splitByParagraph = knowledgeBase?.split_by === 'paragraph' || knowledgeBase?.split_by === 'page';

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
        // 优先使用清理后的文本，如果没有则使用原始 pages
        const cleanedMarkdown = converted.data?.cleanedMarkdown;
        const pages = cleanedMarkdown
            ? [{ pageNumber: 1, content: cleanedMarkdown }] // 使用清理后的整体文本
            : converted.data?.data?.pages || []; // 降级使用原始 pages

        const documentName = converted.data?.metadata?.fileName || '未知文档';

        logger.info('准备分块文档', {
            documentId,
            useCleanedText: !!cleanedMarkdown,
            pagesCount: pages.length,
            maxChunkSize,
            overlapSize
        });

        const split = await splitDocumentAction(
            documentId,
            pages,
            {
                model: options.model,
                maintainFormat: options.maintainFormat,
                prompt: options.prompt,
                documentName,
                maxChunkSize,
                overlapSize,
                splitByParagraph
            }
        );

        if (!split.success || !split.data) {
            return {
                success: false,
                error: split.error || '文档分割失败'
            };
        }

        // 3. 索引文档块
        logger.info('开始索引文档块', { documentId, chunkCount: split.data.chunks.length });
        const index = await indexDocumentChunksAction(
            documentId,
            kbId,
            split.data.chunks
        );

        if (!index.success) {
            logger.error('文档索引失败', { documentId, error: index.error });
            return {
                success: false,
                error: index.error || '文档索引失败'
            };
        }

        logger.info('文档处理完成', { documentId, status: 'SUCCESSED' });

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
*/  // 原实现结束
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
            select: {
                id: true,
                name: true,
                created_by: true,
                knowledgeBaseId: true,
                knowledgeBase: {
                    select: {
                        language: true,
                    },
                },
                uploadFile: {
                    select: {
                        location: true
                    }
                }
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

        if (!document.created_by) {
            return {
                success: false,
                error: '文档创建者信息不存在'
            };
        }

        // 获取用户的文档解析器配置
        const userConfig = await prisma.searchConfig.findUnique({
            where: { userId: document.created_by },
            select: {
                documentParser: true,
                mineruApiKey: true
            }
        });

        if (!userConfig) {
            return {
                success: false,
                error: '未找到用户配置。请访问 /settings/document 页面配置文档解析器'
            };
        }

        const kbLanguage = normalizeLanguage(document.knowledgeBase?.language);

        // 构建用户文档处理上下文
        const documentContext: UserDocumentContext = {
            userId: document.created_by,
            documentParser: userConfig.documentParser as any,
            mineruApiKey: userConfig.mineruApiKey ? decryptApiKey(userConfig.mineruApiKey) : undefined,
        };

        logger.info(`[convertDocumentAction] 📄 User ${document.created_by.substring(0, 8)}... using parser: ${documentContext.documentParser}`);

        // 在用户上下文中调用文档处理函数
        const result: DocumentProcessJobResult = await userDocumentContextStorage.run(documentContext, async () => {
            return await processDocument({
                documentId,
                userId: document.created_by!,
                documentInfo: {
                    name: document.name,
                    uploadFile: {
                        location: document.uploadFile!.location
                    }
                },
                options: {
                    model: options.model,
                    maintainFormat: options.maintainFormat,
                    prompt: options.prompt,
                    language: kbLanguage,
                }
            });
        });

        if (!result.success) {
            return {
                success: false,
                error: result.error || '处理文档失败'
            };
        }
        // 提取Markdown内容
        let markdown_content = result.data?.pages?.map((page: { content: string }) => page.content).join('\n\n') || '';

        // 使用 LLM 清理 PDF 提取的多余换行（可通过环境变量控制）
        const enableTextCleaning = process.env.ENABLE_TEXT_CLEANING !== 'false'; // 默认启用

        if (enableTextCleaning && markdown_content && markdown_content.length > 0) {
            try {
                logger.info('开始清理文档文本', {
                    documentId,
                    originalLength: markdown_content.length
                });

                // 推送进度到 Redis
                await updateDocumentProgress(documentId, 50, '正在清理文本...');

                const { cleanLongText } = await import('@/lib/text-cleaner');
                const cleanResult = await cleanLongText(markdown_content, {
                    userId: document.created_by, // 传递用户ID以使用用户配置的 LLM
                    language: kbLanguage,
                });

                if (cleanResult.success && cleanResult.cleanedText) {
                    markdown_content = cleanResult.cleanedText;
                    logger.info('文档文本清理完成', {
                        documentId,
                        originalLength: result.data?.pages?.map((p: { content: string }) => p.content).join('\n\n').length,
                        cleanedLength: markdown_content.length
                    });

                    // 推送进度到 Redis
                    await updateDocumentProgress(documentId, 55, '文本清理完成');
                } else {
                    logger.warn('文档文本清理失败，使用原始文本', {
                        documentId,
                        error: cleanResult.error
                    });
                }
            } catch (error) {
                logger.error('文档文本清理出错，使用原始文本', {
                    documentId,
                    error: error instanceof Error ? error.message : '未知错误'
                });
            }
        } else if (!enableTextCleaning) {
            logger.info('文本清理功能已禁用', { documentId });
        }

        // 将完整结果保存为字符串
        const rawData = result.data ? JSON.stringify(result.data) : '{}';

        // 将Markdown内容上传到MinIO，获取URL
        let content_url = null;
        // 如果markdown_content不为空，则上传到MinIO
        console.log('markdown_content', markdown_content ? `${markdown_content.substring(0, 20)}...` : '(empty)');
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

                // 推送进度到 Redis
                await updateDocumentProgress(documentId, 58, '内容已上传');
            } catch (error) {
                console.error('上传Markdown内容到MinIO失败:', error);
            }
        }

        // 更新文档处理状态
        try {
            // 先检查文档是否存在
            const docExists = await prisma.document.findUnique({
                where: { id: documentId },
                select: { id: true }
            });

            if (!docExists) {
                throw new Error(`文档 ${documentId} 不存在，可能已被删除`);
            }

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
                },
                cleanedMarkdown: markdown_content // 添加清理后的文本，供分块使用
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

        // 推送进度：开始分块
        await updateDocumentProgress(documentId, 50, '开始分块...');

        // 创建文档分割器
        // 使用传入的配置，如果没有则使用更大的默认值（2000字符）以减少分块数量
        const splitter = new DocumentSplitter({
            maxChunkSize: options.maxChunkSize || 2000,
            overlapSize: options.overlapSize || 200,
            splitByParagraph: options.splitByParagraph !== undefined ? options.splitByParagraph : true,
            preserveFormat: options.maintainFormat
        });

        // 处理每个页面
        const allChunks: DocumentChunk[] = [];
        let totalChunks = 0;
        let globalChunkIndex = 0; // 全局 chunk 索引，防止重复

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];

            // 推送进度：正在处理第 i+1 页
            const progress = 50 + Math.floor((i / pages.length) * 10); // 50% → 60%
            await updateDocumentProgress(documentId, progress, `正在分块第 ${i + 1}/${pages.length} 页...`);

            // 分割页面内容
            const chunks = splitter.splitDocument(page.content, {
                documentId,
                documentName: options.documentName,
                pageNumber: page.pageNumber,
                model: options.model,
                maintainFormat: options.maintainFormat,
                prompt: options.prompt
            });

            // 重新生成全局唯一的 chunk ID
            const reindexedChunks = chunks.map((chunk, localIndex) => ({
                ...chunk,
                id: `${documentId}-chunk-${globalChunkIndex + localIndex}`,
                metadata: {
                    ...chunk.metadata,
                    position: globalChunkIndex + localIndex, // 更新全局位置
                }
            }));

            globalChunkIndex += chunks.length;
            totalChunks += chunks.length;
            allChunks.push(...reindexedChunks);
        }

        // 推送进度：分块完成
        await updateDocumentProgress(documentId, 60, `分块完成，共 ${totalChunks} 个块`);

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
        // 更新状态并推送进度
        await prisma.document.update({
            where: { id: documentId },
            data: {
                chunk_num: chunks.length,
                processing_status: IDocumentProcessingStatus.INDEXING,
                progress: 60,
                progress_msg: `开始索引 ${chunks.length} 个文档块...`
            }
        });

        // 推送进度到 Redis（SSE）
        await updateDocumentStatus(documentId, IDocumentProcessingStatus.INDEXING, `开始索引 ${chunks.length} 个文档块...`);
        await updateDocumentProgress(documentId, 60, `开始索引 ${chunks.length} 个文档块...`);

        // 获取文档的创建者 ID（用于获取用户配置的 OpenAI API URL 和模型）
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            select: { created_by: true }
        });
        const userId = document?.created_by || undefined;

        // 获取用户配置的嵌入模型（如果 userId 存在）
        let embeddingModel = 'text-embedding-3-small'; // 默认模型
        if (userId) {
            try {
                const userConfig = await prisma.searchConfig.findUnique({
                    where: { userId },
                    select: {
                        embeddingModel: true
                    }
                });
                if (userConfig?.embeddingModel) {
                    embeddingModel = userConfig.embeddingModel;
                    logger.info(`[indexDocumentChunksAction] 使用用户配置的嵌入模型: ${embeddingModel}`);
                }
            } catch (error) {
                logger.warn(`[indexDocumentChunksAction] 获取用户嵌入模型配置失败，使用默认模型`, { userId, error });
            }
        }

        const indexer = new ChunkIndexer({
            embeddingModel: embeddingModel, // 使用用户配置的模型
            batchSize: 10,
            kbId: kbId,
            userId: userId // 传递 userId 以使用用户配置的 OpenAI API URL
        });

        // 推送进度：正在生成嵌入向量
        await updateDocumentProgress(documentId, 70, `正在生成嵌入向量 (0/${chunks.length})...`);

        const indexResult = await indexer.indexChunks(chunks);

        // 推送进度：索引完成
        await updateDocumentProgress(documentId, 90, `索引完成，正在保存...`);

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

        // 计算总 token 数（简单估算：按空格分词）
        const totalTokens = chunks.reduce((sum, chunk) => {
            const tokens = chunk.content.split(/\s+/).filter(t => t.length > 0).length;
            return sum + tokens;
        }, 0);

        logger.info('文档块索引完成', {
            documentId,
            indexedCount: indexResult.indexedCount,
            totalChunks: chunks.length,
            totalTokens
        });

        // 更新状态并推送进度
        await prisma.document.update({
            where: { id: documentId },
            data: {
                chunk_num: chunks.length,
                token_num: totalTokens,
                processing_status: IDocumentProcessingStatus.SUCCESSED,
                progress: 100,
                progress_msg: '处理完成'
            }
        });

        // 推送进度：100% 完成
        await updateDocumentProgress(documentId, 100, '处理完成');
        await updateDocumentStatus(documentId, IDocumentProcessingStatus.SUCCESSED, '处理完成');

        // 更新知识库的总 token 数和分块数
        await prisma.knowledgeBase.update({
            where: { id: kbId },
            data: {
                chunk_num: {
                    increment: chunks.length
                },
                token_num: {
                    increment: totalTokens
                }
            }
        });

        logger.info('已更新知识库统计', {
            kbId,
            addedChunks: chunks.length,
            addedTokens: totalTokens
        });

        // 推送完成状态到 Redis
        await reportDocumentComplete(documentId, {
            chunksCount: chunks.length,
            totalTokens,
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

// 使用队列处理文档的server action（生产模式，推荐使用）
export async function processDocumentAction(
    documentId: string,
    options: {
        model: string;
        maintainFormat: boolean;
        prompt?: string;
    }
): Promise<ServerActionResponse<{ success: boolean; jobId?: string }>> {
    try {
        const startTime = Date.now();

        // 获取文档信息
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            include: {
                uploadFile: true,
                knowledgeBase: {
                    select: {
                        id: true,
                        language: true,
                        chunk_size: true,
                        overlap_size: true,
                        split_by: true,
                    }
                }
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

        // 只在文档未处理或失败时才重置状态
        // 如果文档已完成（SUCCESSED）或已转换（CONVERTED），保持当前状态或记录重新处理日志
        const shouldResetStatus = !document.processing_status ||
            document.processing_status === IDocumentProcessingStatus.UNPROCESSED ||
            document.processing_status === IDocumentProcessingStatus.FAILED;

        const isReprocessing = document.processing_status === IDocumentProcessingStatus.SUCCESSED ||
            document.processing_status === IDocumentProcessingStatus.CONVERTED;

        // 更新文档状态
        await prisma.document.update({
            where: { id: documentId },
            data: {
                processing_status: shouldResetStatus
                    ? IDocumentProcessingStatus.UNPROCESSED
                    : document.processing_status, // 保持当前状态
                progress: shouldResetStatus ? 0 : (document.progress || 0),
                progress_msg: shouldResetStatus
                    ? '已添加到队列，等待处理...'
                    : (isReprocessing ? '重新处理中，已添加到队列...' : '已添加到队列，等待处理...'),
            }
        });

        if (isReprocessing) {
            logger.info(`[processDocumentAction] 文档 ${documentId} 重新处理，当前状态: ${document.processing_status}`);
        }

        // 添加任务到队列（使用 BullMQ）
        const { addTask } = await import('@/lib/bullmq/queue-manager');
        const { TaskType } = await import('@/lib/bullmq/types');

        const kbLanguage = normalizeLanguage(document.knowledgeBase?.language);

        const jobId = await addTask(
            TaskType.DOCUMENT_CONVERT_TO_MD,
            {
                documentId,
                userId: document.created_by,
                documentInfo: {
                    name: document.name,
                    uploadFile: {
                        location: document.uploadFile.location
                    }
                },
                options: {
                    model: options.model,
                    maintainFormat: options.maintainFormat,
                    prompt: options.prompt,
                    language: kbLanguage,
                }
            },
            `process-${documentId}`
        );

        logger.info('文档已添加到队列', { documentId, jobId });

        return {
            success: true,
            data: { success: true, jobId }
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
        const progress = options?.progress ?? 0;
        const progressMsg = options?.progressMsg || '';

        // 更新数据库
        await prisma.document.update({
            where: { id: documentId },
            data: {
                processing_status: {
                    set: status
                },
                progress,
                progress_msg: progressMsg,
                processing_error: options?.error || null,
                ...(status === IDocumentProcessingStatus.CONVERTING && {
                    process_begin_at: new Date()
                })
            }
        });

        // 推送进度事件到 Redis（SSE）
        try {
            // 推送状态更新
            await updateDocumentStatus(documentId, status, progressMsg);

            // 如果有进度，也推送进度更新
            if (progress > 0) {
                await updateDocumentProgress(documentId, progress, progressMsg);
            }

            // 如果有错误，推送错误事件
            if (options?.error) {
                await reportDocumentError(documentId, options.error);
            }
        } catch (sseError) {
            // SSE 推送失败不影响主流程，只记录日志
            logger.warn('推送 SSE 进度事件失败', {
                documentId,
                error: sseError instanceof Error ? sseError.message : '未知错误'
            });
        }

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