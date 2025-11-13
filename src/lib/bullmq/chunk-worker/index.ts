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
import { readTextFromUrl } from '@/lib/minio/operations';

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
                markdown_url: true, // 改为读取 markdown_url（存储 markdown URL）
                knowledgeBaseId: true,
                processing_status: true,
                parser_id: true, // 文档自己的 parser_id（创建时从知识库复制）
                parser_config: true, // 文档自己的 parser_config（创建时从知识库复制）
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
            // 如果状态是 SUCCESSED，说明已经处理完成，不需要再次索引
            if (document.processing_status === IDocumentProcessingStatus.SUCCESSED) {
                logger.info(`[Chunk Worker] 文档 ${documentId} 已经处理完成，跳过索引`);
                return {
                    success: true,
                    indexedCount: 0,
                    totalChunks: 0,
                };
            }
            // 如果状态不是 CONVERTED 也不是 SUCCESSED，抛出错误
            throw new Error(`文档 ${documentId} 的状态为 ${document.processing_status}，无法开始索引`);
        }

        // 从 MinIO 读取 markdown 内容
        if (!document.markdown_url) {
            throw new Error(`文档 ${documentId} 的 markdown_url 为空，无法读取 markdown 内容`);
        }

        let markdownContent: string;
        try {
            markdownContent = await readTextFromUrl(document.markdown_url);
            logger.info(`[Chunk Worker] 成功从 MinIO 读取 markdown 内容，长度: ${markdownContent.length}`);
        } catch (error) {
            logger.error(`[Chunk Worker] 从 MinIO 读取 markdown 内容失败:`, error);
            throw new Error(`无法从 MinIO 读取文档 ${documentId} 的 markdown 内容: ${error instanceof Error ? error.message : '未知错误'}`);
        }

        if (!kbId) {
            throw new Error(`文档 ${documentId} 的 knowledgeBaseId 为空`);
        }

        const normalizedLanguage = normalizeLanguage(options.language || document.knowledgeBase?.language);
        const languageDefaults = getChunkingDefaultsForLanguage(normalizedLanguage);

        // 更新状态为索引中（只推送 SSE，不写入数据库）
        await updateDocumentStatus(documentId, IDocumentProcessingStatus.INDEXING, '开始分块...');
        await updateDocumentProgress(documentId, 50, '开始分块...');

        // 1. 分块文档
        logger.info('开始文档分割', {
            documentId,
            contentLength: markdownContent.length,
            language: normalizedLanguage,
        });

        // 获取分块模式：优先使用文档自己的配置（创建时从知识库复制），如果为空则使用知识库的配置
        const documentParserId = document.parser_id as 'llm_segmentation' | 'rule_segmentation' | 'jina_segmentation' | null | undefined | string;
        const kbParserId = document.knowledgeBase?.parser_id as 'llm_segmentation' | 'rule_segmentation' | 'jina_segmentation' | null | undefined | string;
        // 处理空字符串的情况：如果 parser_id 是空字符串，视为 null
        const effectiveDocumentParserId = (documentParserId && documentParserId.trim() !== '')
            ? (documentParserId as 'llm_segmentation' | 'rule_segmentation' | 'jina_segmentation')
            : null;
        const effectiveKbParserId = (kbParserId && kbParserId.trim() !== '')
            ? (kbParserId as 'llm_segmentation' | 'rule_segmentation' | 'jina_segmentation')
            : null;
        const parserMode = effectiveDocumentParserId || effectiveKbParserId || languageDefaults.parserMode;

        // 优先使用文档的 parser_config，如果为空则使用知识库的配置
        const documentParserConfig = document.parser_config as any;
        const kbParserConfig = document.knowledgeBase?.parser_config as any;
        const parserConfig = (documentParserConfig && Object.keys(documentParserConfig).length > 0)
            ? documentParserConfig
            : (kbParserConfig && Object.keys(kbParserConfig).length > 0 ? kbParserConfig : {});
        const llmChunkPrompt = parserConfig?.llm_chunk_prompt;

        // 检查智能分块所需的配置
        if (parserMode === 'jina_segmentation') {
            const searchConfig = await prisma.searchConfig.findUnique({
                where: { userId },
                select: { jinaApiKey: true, jinaChunkMaxLength: true },
            });
            if (!searchConfig || !searchConfig.jinaApiKey) {
                throw new Error(
                    '未配置 Jina API Key。请访问 /settings/search 页面配置您的 Jina API Key'
                );
            }
            // 如果 parserConfig 中没有 jina_max_chunk_length，使用 SearchConfig 中的值
            if (!parserConfig.jina_max_chunk_length && searchConfig.jinaChunkMaxLength) {
                parserConfig.jina_max_chunk_length = searchConfig.jinaChunkMaxLength;
            }
        }

        if (parserMode === 'llm_segmentation') {
            const llmConfig = await prisma.lLMConfig.findFirst({
                where: {
                    userId: userId,
                    isActive: true,
                },
            });
            if (!llmConfig) {
                throw new Error(
                    '未配置 LLM API Key。请访问 /settings/llm 页面配置您的 LLM API Key'
                );
            }
        }

        logger.info(`[Chunk Worker] 使用分块模式: ${parserMode}`, {
            documentId,
            parserMode,
            source: effectiveDocumentParserId ? 'document' : (effectiveKbParserId ? 'knowledgeBase' : 'default'),
            documentParserId: documentParserId,
            kbParserId: kbParserId,
            language: normalizedLanguage,
            hasCustomPrompt: !!llmChunkPrompt,
            userId: userId,
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
            userId: userId, // 传递 userId 用于智能分块
            parserConfig: parserConfig, // 传递 parserConfig
        });

        // 将markdown内容作为单页处理
        const pages = [{ pageNumber: 1, content: markdownContent }];
        const allChunks: DocumentChunk[] = [];
        let globalChunkIndex = 0;

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const progress = 50 + Math.floor((i / pages.length) * 10);
            await updateDocumentProgress(documentId, progress, `正在分块第 ${i + 1}/${pages.length} 页...`);

            // 使用异步版本的 splitDocument（支持智能分块）
            const chunks = await splitter.splitDocument(page.content, {
                documentId,
                documentName: options.documentName,
                pageNumber: page.pageNumber,
                model: options.model,
                maintainFormat: options.maintainFormat,
                prompt: llmChunkPrompt || options.prompt,
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

        // 2. 索引文档块（只更新 chunk_num，不更新状态，INDEXING 状态只通过 SSE 推送）
        await prisma.document.update({
            where: { id: documentId },
            data: {
                chunk_num: totalChunks,
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
            language: normalizedLanguage,
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

