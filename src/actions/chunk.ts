'use server';

import { prisma } from '@/lib/prisma';
import { ServerActionResponse } from '@/types/actions';
import { revalidatePath } from 'next/cache';
import logger from '@/utils/logger';
import { searchSimilarChunks } from '@/lib/milvus/operations';
import { getEmbedding } from '@/lib/llm-provider';

/**
 * 获取文档的所有分块
 * @param documentId - 文档ID
 * @returns 文档信息和分块列表
 */
export async function getDocumentChunksAction(documentId: string): Promise<ServerActionResponse<any>> {
    try {
        // 获取文档信息（content_url 存储 markdown 的 URL）
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            select: {
                id: true,
                name: true,
                type: true,
                file_url: true,
                content_url: true, // markdown 的 URL（存储在 MinIO）
                processing_status: true,
                progress: true,
                progress_msg: true,
                chunk_num: true,
                token_num: true,
                create_date: true,
                update_date: true,
                created_by: true,
                knowledgeBaseId: true,
                enabled: true,
                uploadFileId: true,
            }
        });

        if (!document) {
            return {
                success: false,
                error: '文档不存在'
            };
        }

        // 获取文档的所有分块
        const chunks = await prisma.chunk.findMany({
            where: { doc_id: documentId },
            orderBy: { chunk_id: 'asc' }
        });

        logger.info(`[getDocumentChunksAction] Fetched ${chunks.length} chunks from DB for doc ${documentId}.`, { documentId });

        const mappedChunks = chunks.map(chunk => ({
            id: chunk.id,
            chunk_id: chunk.chunk_id,
            doc_id: chunk.doc_id,
            content_with_weight: chunk.content_with_weight,
            available_int: chunk.available_int,
            doc_name: chunk.doc_name,
            img_id: chunk.img_id,
            important_kwd: chunk.important_kwd,
            question_kwd: chunk.question_kwd,
            tag_kwd: chunk.tag_kwd,
            positions: chunk.positions,
            tag_feas: chunk.tag_feas,
            kb_id: chunk.kb_id,
            createdAt: chunk.createdAt,
            updatedAt: chunk.updatedAt
        }));

        logger.info(`[getDocumentChunksAction] Returning ${mappedChunks.length} mapped chunks for doc ${documentId}.`, { documentId });

        return {
            success: true,
            data: {
                document,
                chunks: mappedChunks
            }
        };
    } catch (error) {
        console.error('获取文档分块失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '获取文档分块失败'
        };
    }
}

/**
 * 切换 Chunk 的可用状态
 * @param chunkId - Chunk ID
 * @param available - 新的可用状态 (true for 1, false for 0)
 * @returns 更新结果
 */
export async function toggleChunkAvailabilityAction(chunkId: string, available: boolean): Promise<ServerActionResponse<any>> {
    try {
        const chunk = await prisma.chunk.findUnique({
            where: { id: chunkId },
            select: { doc_id: true }
        });

        if (!chunk) {
            return { success: false, error: '分块不存在' };
        }

        await prisma.chunk.update({
            where: { id: chunkId },
            data: {
                available_int: available ? 1 : 0
            }
        });

        revalidatePath(`/chunks/${chunk.doc_id}`);

        return { success: true };
    } catch (error) {
        console.error('切换分块可用状态失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '更新失败'
        };
    }
}

/**
 * 在知识库中搜索分块内容（使用 BM25 + 向量混合搜索）
 * @param kbId - 知识库 ID
 * @param keyword - 搜索关键词
 * @param limit - 返回结果数量上限
 */
export async function searchKnowledgeBaseSnippetsAction(
    kbId: string,
    keyword: string,
    limit: number = 20,
    userId?: string // 添加 userId 参数
): Promise<ServerActionResponse<any>> {
    try {
        const trimmedKeyword = keyword?.trim();
        if (!kbId || !trimmedKeyword) {
            return {
                success: false,
                error: '知识库 ID 或搜索关键词不能为空'
            };
        }

        logger.info('[searchKnowledgeBaseSnippetsAction] Starting search', { kbId, keyword: trimmedKeyword, limit, userId: userId || '(system)' });

        // 先检查知识库中是否有可用的chunks
        const availableChunksCount = await prisma.chunk.count({
            where: {
                kb_id: kbId,
                available_int: 1
            }
        });

        console.log(`[searchKnowledgeBaseSnippetsAction] Available chunks in KB: ${availableChunksCount}`);

        if (availableChunksCount === 0) {
            logger.warn('[searchKnowledgeBaseSnippetsAction] No available chunks in knowledge base', { kbId });
            return {
                success: true,
                data: []
            };
        }

        let chunks = [];

        const runFallbackSearch = async () => {
            console.warn('[searchKnowledgeBaseSnippetsAction] Using fallback text search for keyword:', trimmedKeyword);
            const terms = trimmedKeyword.split(/\s+/).filter(Boolean);

            const fallbackChunks = await prisma.chunk.findMany({
                where: {
                    kb_id: kbId,
                    available_int: 1,
                    OR: terms.map(term => ({
                        content_with_weight: {
                            contains: term,
                            mode: 'insensitive'
                        }
                    }))
                },
                select: {
                    id: true,
                    chunk_id: true,
                    doc_id: true,
                    doc_name: true,
                    content_with_weight: true,
                    updatedAt: true
                },
                orderBy: {
                    updatedAt: 'desc'
                },
                take: limit
            });

            console.log(`[searchKnowledgeBaseSnippetsAction] Fallback text search found ${fallbackChunks.length} chunks`);
            logger.info('[searchKnowledgeBaseSnippetsAction] Using fallback results', {
                resultCount: fallbackChunks.length
            });

            return fallbackChunks.map(chunk => ({
                id: chunk.id,
                chunk_id: chunk.chunk_id,
                content_with_weight: chunk.content_with_weight,
                doc_id: chunk.doc_id,
                doc_name: chunk.doc_name,
                positions: '',
                tag_feas: '',
                similarity: 0.5,
                bm25_similarity: 0.5,
                vector_similarity: 0,
                updated_at: chunk.updatedAt.toISOString()
            }));
        };

        try {
            // 1. 生成查询向量（用于向量搜索），传递 userId 以使用用户配置
            console.log('[searchKnowledgeBaseSnippetsAction] Generating embedding...');
            const queryEmbedding = await getEmbedding(trimmedKeyword, 'text-embedding-3-small', userId);
            console.log('[searchKnowledgeBaseSnippetsAction] Embedding generated, vector length:', queryEmbedding.length);

            // 2. 使用混合搜索（BM25 + 向量搜索）
            console.log('[searchKnowledgeBaseSnippetsAction] Performing hybrid search with params:', {
                kbId,
                queryLength: trimmedKeyword.length,
                vectorLength: queryEmbedding.length,
                resultLimit: limit * 2
            });

            chunks = await searchSimilarChunks({
                queryText: trimmedKeyword,
                queryVector: queryEmbedding,
                kbId,
                resultLimit: limit * 2, // 获取更多候选结果
                bm25Weight: 0.5,        // BM25 权重
                vectorWeight: 0.5,      // 向量搜索权重
                bm25Threshold: 0.0,     // 降低BM25最低阈值
                vectorThreshold: 0.0,   // 降低向量相似度最低阈值
                minSimilarity: 0.0      // 降低综合相似度最低阈值
            });

            console.log(`[searchKnowledgeBaseSnippetsAction] Found ${chunks.length} chunks using hybrid search.`);

            // 如果混合搜索没有结果，尝试纯文本搜索
            if (chunks.length === 0) {
                console.warn('[searchKnowledgeBaseSnippetsAction] Hybrid search returned 0 results, switching to fallback text search...');
                chunks = await runFallbackSearch();
            }
        } catch (searchError) {
            console.error('[searchKnowledgeBaseSnippetsAction] Hybrid search error, using fallback text search:', searchError);
            logger.warn('[searchKnowledgeBaseSnippetsAction] Hybrid search failed, fallback engaged', {
                error: searchError instanceof Error ? searchError.message : searchError,
                kbId,
                keyword: trimmedKeyword
            });
            chunks = await runFallbackSearch();
        }

        // 3. 格式化返回结果，并按相似度排序，只返回前limit个
        const sortedChunks = chunks
            .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
            .slice(0, limit);

        logger.info('[searchKnowledgeBaseSnippetsAction] Returning results', {
            resultCount: sortedChunks.length,
            topSimilarity: sortedChunks[0]?.similarity || 0
        });

        return {
            success: true,
            data: sortedChunks.map(chunk => ({
                id: chunk.id,
                chunkId: chunk.chunk_id,
                docId: chunk.doc_id,
                docName: chunk.doc_name,
                content: chunk.content_with_weight,
                updatedAt: (chunk as any).updated_at || new Date().toISOString(),
                similarity: chunk.similarity,
                bm25Similarity: chunk.bm25_similarity,
                vectorSimilarity: chunk.vector_similarity
            }))
        };
    } catch (error) {
        console.error('搜索分块内容失败:', error);
        logger.error('[searchKnowledgeBaseSnippetsAction] failed', { error, kbId, keyword });
        return {
            success: false,
            error: error instanceof Error ? error.message : '搜索分块内容失败'
        };
    }
}