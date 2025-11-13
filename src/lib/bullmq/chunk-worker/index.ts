import { createWorker } from '../queue-manager';
import { ChunkIndexJobData, ChunkIndexJobResult } from './types';
import { TaskType } from '../types';
import { Job } from 'bullmq';
import logger from '@/utils/logger';
import { PrismaClient } from '@prisma/client';
import { IDocumentProcessingStatus } from '@/types/enums';
import { DocumentSplitter, DocumentChunk } from '@/lib/document-splitter';
import { ChunkIndexer } from '@/lib/chunk-indexer';
import {
    updateDocumentProgress,
    updateDocumentStatus,
    reportDocumentError,
    reportDocumentComplete
} from '@/lib/document-tracker';
import { getChunkingDefaultsForLanguage, normalizeLanguage } from '@/constants/language';

const prisma = new PrismaClient();

/**
 * 处理分块和向量索引任务
 */
async function processChunkIndexJob(job: Job<ChunkIndexJobData, ChunkIndexJobResult>): Promise<ChunkIndexJobResult> {
    const { documentId, kbId, userId, options } = job.data;

    try {
        logger.info(`[Chunk Worker] 开始处理文档 ${documentId} 的分块索引任务`);

        // 获取文档信息（包括处理状态和知识库配置）
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            select: {
                id: true,
                name: true,
                markdown_content: true,
                knowledgeBaseId: true,
                processing_status: true,
                knowledgeBase: {
                    select: {
                        parser_id: true,
                        parser_config: true,
                        language: true,
                        chunk_size: true,
                        overlap_size: true,
                        split_by: true,
                    }
                }
            }
        });

        if (!document) {
            throw new Error(`文档 ${documentId} 不存在`);
        }

        // 检查文档状态是否为 CONVERTED，如果不是则记录警告
        if (document.processing_status !== IDocumentProcessingStatus.CONVERTED) {
            logger.warn(`[Chunk Worker] 文档 ${documentId} 的状态为 ${document.processing_status}，期望为 CONVERTED`);
            // 如果状态是 CONVERTING，可能是转换还没完成，抛出错误
            if (document.processing_status === IDocumentProcessingStatus.CONVERTING) {
                throw new Error(`文档 ${documentId} 仍在转换中，无法开始索引`);
            }
            // 如果状态是 SUCCESSED，说明已经处理完成，不需要再次索引
            if (document.processing_status === IDocumentProcessingStatus.SUCCESSED) {
                logger.info(`[Chunk Worker] 文档 ${documentId} 已经处理完成，跳过索引`);
                return {
                    success: true,
                    indexedCount: 0,
                    totalChunks: 0,
                };
            }
        }

        if (!document.markdown_content) {
            throw new Error(`文档 ${documentId} 的 markdown_content 为空`);
        }

        if (!kbId) {
            throw new Error(`文档 ${documentId} 的 knowledgeBaseId 为空`);
        }

        const normalizedLanguage = normalizeLanguage(options.language || document.knowledgeBase?.language);
        const languageDefaults = getChunkingDefaultsForLanguage(normalizedLanguage);

        // 更新状态为索引中
        await updateDocumentStatus(documentId, IDocumentProcessingStatus.INDEXING, '开始分块...');
        await updateDocumentProgress(documentId, 50, '开始分块...');

        // 1. 分块文档
        logger.info('开始文档分割', {
            documentId,
            contentLength: document.markdown_content.length,
            language: normalizedLanguage,
        });

        // 获取知识库的分块模式
        const parserMode = (document.knowledgeBase?.parser_id as 'llm_segmentation' | 'rule_segmentation') || languageDefaults.parserMode;
        const parserConfig = document.knowledgeBase?.parser_config as any;
        const llmChunkPrompt = parserConfig?.llm_chunk_prompt;

        logger.info(`[Chunk Worker] 使用分块模式: ${parserMode}`, {
            documentId,
            parserMode,
            language: normalizedLanguage,
            hasCustomPrompt: !!llmChunkPrompt
        });

        const maxChunkSize =
            options.maxChunkSize ||
            document.knowledgeBase?.chunk_size ||
            languageDefaults.maxChunkSize;
        const overlapSize =
            options.overlapSize ??
            document.knowledgeBase?.overlap_size ??
            languageDefaults.overlapSize;
        const kbSplitByParagraph = document.knowledgeBase?.split_by
            ? (['paragraph', 'page'].includes(document.knowledgeBase.split_by) ? true : false)
            : undefined;
        const splitByParagraph =
            options.splitByParagraph !== undefined
                ? options.splitByParagraph
                : kbSplitByParagraph !== undefined
                    ? kbSplitByParagraph
                    : languageDefaults.splitByParagraph;

        const splitter = new DocumentSplitter({
            maxChunkSize,
            overlapSize,
            splitByParagraph,
            preserveFormat: options.maintainFormat,
            parserMode: parserMode,
        });

        // 将markdown内容作为单页处理
        const pages = [{ pageNumber: 1, content: document.markdown_content }];
        const allChunks: DocumentChunk[] = [];
        let globalChunkIndex = 0;

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const progress = 50 + Math.floor((i / pages.length) * 10);
            await updateDocumentProgress(documentId, progress, `正在分块第 ${i + 1}/${pages.length} 页...`);

            // 优先使用知识库配置的自定义 prompt，否则使用传入的 prompt
            const finalPrompt = llmChunkPrompt || options.prompt;

            const chunks = splitter.splitDocument(page.content, {
                documentId,
                documentName: options.documentName,
                pageNumber: page.pageNumber,
                model: options.model,
                maintainFormat: options.maintainFormat,
                prompt: finalPrompt
            });

            const reindexedChunks = chunks.map((chunk, localIndex) => ({
                ...chunk,
                id: `${documentId}-chunk-${globalChunkIndex + localIndex}`,
                metadata: {
                    ...chunk.metadata,
                    position: globalChunkIndex + localIndex,
                    language: normalizedLanguage,
                }
            }));

            globalChunkIndex += chunks.length;
            allChunks.push(...reindexedChunks);
        }

        const totalChunks = allChunks.length;
        await updateDocumentProgress(documentId, 60, `分块完成，共 ${totalChunks} 个块`);

        logger.info('文档分割完成', {
            documentId,
            totalChunks,
            language: normalizedLanguage,
        });

        // 2. 索引文档块（从 CONVERTED 状态转换到 INDEXING）
        await prisma.document.update({
            where: { id: documentId },
            data: {
                chunk_num: totalChunks,
                processing_status: IDocumentProcessingStatus.INDEXING, // 从 CONVERTED 转换到 INDEXING
                progress: 60,
                progress_msg: `开始索引 ${totalChunks} 个文档块...`
            }
        });

        await updateDocumentStatus(documentId, IDocumentProcessingStatus.INDEXING, `开始索引 ${totalChunks} 个文档块...`);
        await updateDocumentProgress(documentId, 60, `开始索引 ${totalChunks} 个文档块...`);

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
                    logger.info(`[Chunk Worker] 使用用户配置的嵌入模型: ${embeddingModel}`);
                }
            } catch (error) {
                logger.warn(`[Chunk Worker] 获取用户嵌入模型配置失败，使用默认模型`, { userId, error });
            }
        }

        const indexer = new ChunkIndexer({
            embeddingModel: embeddingModel, // 使用用户配置的模型
            batchSize: 10,
            kbId: kbId,
            userId: userId // 传递 userId 以使用用户配置的 OpenAI API URL
        });

        await updateDocumentProgress(documentId, 70, `正在生成嵌入向量 (0/${totalChunks})...`);

        const indexResult = await indexer.indexChunks(allChunks);

        await updateDocumentProgress(documentId, 90, `索引完成，正在保存...`);

        if (!indexResult.success) {
            throw new Error(indexResult.error || '索引文档块失败');
        }

        // 计算总 token 数
        const totalTokens = allChunks.reduce((sum, chunk) => {
            const tokens = chunk.content.split(/\s+/).filter(t => t.length > 0).length;
            return sum + tokens;
        }, 0);

        logger.info('文档块索引完成', {
            documentId,
            indexedCount: indexResult.indexedCount,
            totalChunks,
            totalTokens
        });

        // 3. 更新文档状态为完成
        await prisma.document.update({
            where: { id: documentId },
            data: {
                chunk_num: totalChunks,
                token_num: totalTokens,
                processing_status: IDocumentProcessingStatus.SUCCESSED,
                progress: 100,
                progress_msg: '处理完成'
            }
        });

        await updateDocumentProgress(documentId, 100, '处理完成');
        await updateDocumentStatus(documentId, IDocumentProcessingStatus.SUCCESSED, '处理完成');

        // 更新知识库的总 token 数和分块数
        await prisma.knowledgeBase.update({
            where: { id: kbId },
            data: {
                chunk_num: {
                    increment: totalChunks
                },
                token_num: {
                    increment: totalTokens
                }
            }
        });

        logger.info('已更新知识库统计', {
            kbId,
            addedChunks: totalChunks,
            addedTokens: totalTokens
        });

        // 推送完成状态到 Redis
        await reportDocumentComplete(documentId, {
            chunksCount: totalChunks,
            totalTokens,
        });

        return {
            success: true,
            indexedCount: indexResult.indexedCount,
            totalChunks,
        };
    } catch (error) {
        logger.error(`[Chunk Worker] 文档 ${documentId} 分块索引失败:`, error);

        const errorMsg = error instanceof Error ? error.message : '分块索引失败';
        await reportDocumentError(documentId, errorMsg);

        await prisma.document.update({
            where: { id: documentId },
            data: {
                processing_status: IDocumentProcessingStatus.FAILED,
                progress: 0,
                progress_msg: errorMsg,
            }
        });

        throw error;
    }
}

// 创建并启动 Chunk Worker
const chunkWorker = createWorker<ChunkIndexJobData, ChunkIndexJobResult>(
    TaskType.CHUNK_VECTOR_INDEX,
    processChunkIndexJob
);

logger.info('[Chunk Worker] Chunk Worker 已启动');

export default chunkWorker;

