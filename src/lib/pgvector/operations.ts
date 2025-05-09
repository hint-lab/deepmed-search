"use server"

import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';
import logger from '@/utils/logger';

// 定义查询结果类型
export interface ChunkSearchResult {
    id: string;
    chunk_id: string;
    content_with_weight: string;
    doc_id: string;
    doc_name: string;
    positions: string;
    tag_feas: string;
    similarity: number;
    bm25_similarity: number;
    vector_similarity: number;
}

// pgvector 向量插入参数类型
export interface PgVectorInsertParams {
    vectors: number[][];
    contents: string[];
    docIds: string[];
    metadataList: Record<string, any>[];
    kbId: string;
    docName: string;
}

// 搜索参数接口
export interface SearchParams {
    queryText?: string;
    queryVector?: number[];
    kbId: string;
    resultLimit?: number;
    filter?: string;
    bm25Weight?: number;
    vectorWeight?: number;
    bm25Threshold?: number;    // BM25 相似度阈值
    vectorThreshold?: number;  // 向量相似度阈值
    minSimilarity?: number;    // 最终相似度阈值
}

/**
 * 搜索相似文档，支持BM25 与 Embedding混合检索
 */
export async function searchSimilarChunks({
    queryText = '',
    queryVector = [],
    kbId,
    resultLimit = 5,
    filter = '',
    bm25Weight = 0.5,
    vectorWeight = 0.5,
    bm25Threshold = 0.2,      // 默认 BM25 阈值
    vectorThreshold = 0.7,    // 默认向量相似度阈值
    minSimilarity = 0.5       // 默认最终相似度阈值
}: SearchParams) {
    try {
        console.log('Search params:', { queryText, queryVector, kbId, resultLimit, filter, bm25Weight, vectorWeight, bm25Threshold, vectorThreshold, minSimilarity });
        let sqlQuery;

        // 检查向量是否为空 - 纯BM25模式
        if (!queryVector.length) {
            sqlQuery = Prisma.sql`
                WITH ranked_results AS (
                    SELECT 
                        c.id, 
                        c.chunk_id, 
                        c.content_with_weight, 
                        c.doc_id, 
                        c.doc_name, 
                        c.positions, 
                        c.tag_feas,
                        ts_rank_cd(to_tsvector('jieba_cfg', c.content_with_weight), plainto_tsquery('jieba_cfg', ${queryText}), 32) as bm25_similarity,
                        0 as vector_similarity,
                        ts_rank_cd(to_tsvector('jieba_cfg', c.content_with_weight), plainto_tsquery('jieba_cfg', ${queryText}), 32) as similarity
                    FROM "Chunk" c
                    WHERE c.kb_id = ${kbId}
                    AND c.available_int = 1
                    AND ts_rank_cd(to_tsvector('jieba_cfg', c.content_with_weight), plainto_tsquery('jieba_cfg', ${queryText}), 32) >= ${bm25Threshold}
                )
                SELECT * FROM ranked_results
            `;
        } else {
            // 有向量 - 混合模式或向量模式
            sqlQuery = Prisma.sql`
                WITH ranked_results AS (
                    SELECT 
                        c.id, 
                        c.chunk_id, 
                        c.content_with_weight, 
                        c.doc_id, 
                        c.doc_name, 
                        c.positions, 
                        c.tag_feas,
                        ts_rank_cd(to_tsvector('jieba_cfg', c.content_with_weight), plainto_tsquery('jieba_cfg', ${queryText}), 32) as bm25_similarity,
                        1 - (c.embedding <=> ${Prisma.raw(`'[${queryVector.join(',')}]'::vector`)}) as vector_similarity,
                        (
                            ts_rank_cd(to_tsvector('jieba_cfg', c.content_with_weight), plainto_tsquery('jieba_cfg', ${queryText}), 32) * ${bm25Weight} + 
                            (1 - (c.embedding <=> ${Prisma.raw(`'[${queryVector.join(',')}]'::vector`)})) * ${vectorWeight}
                        ) as similarity
                    FROM "Chunk" c
                    WHERE c.kb_id = ${kbId}
                    AND c.available_int = 1
                    AND (
                        ts_rank_cd(to_tsvector('jieba_cfg', c.content_with_weight), plainto_tsquery('jieba_cfg', ${queryText}), 32) >= ${bm25Threshold}
                        OR (1 - (c.embedding <=> ${Prisma.raw(`'[${queryVector.join(',')}]'::vector`)})) >= ${vectorThreshold}
                    )
                )
                SELECT * FROM ranked_results
            `;
        }

        // 添加filter条件
        if (filter) {
            sqlQuery = Prisma.sql`${sqlQuery} WHERE ${Prisma.raw(filter)}`;
        }

        // 添加最终相似度过滤、排序和限制
        sqlQuery = Prisma.sql`
            ${sqlQuery}
            WHERE similarity >= ${minSimilarity}
            ORDER BY similarity DESC
            LIMIT ${resultLimit}
        `;

        const results = await prisma.$queryRaw<any[]>(sqlQuery);
        return results.map(result => ({
            id: result.id,
            chunk_id: result.chunk_id,
            content_with_weight: result.content_with_weight,
            doc_id: result.doc_id,
            doc_name: result.doc_name,
            positions: result.positions,
            tag_feas: result.tag_feas,
            similarity: result.similarity,
            bm25_similarity: result.bm25_similarity,
            vector_similarity: result.vector_similarity
        } as ChunkSearchResult));
    } catch (error) {
        logger.error('搜索相似文档失败:', { error: error instanceof Error ? error.message : error });
        throw error;
    }
}

/**
 * 插入向量数据 - 检查 chunk_id 是否存在，若存在则跳过
 */
export async function insertVectors({
    vectors,
    contents,
    docIds,
    metadataList,
    kbId,
    docName
}: PgVectorInsertParams): Promise<number> {
    let createdCount = 0;
    try {
        // 检查参数长度是否一致
        if (vectors.length !== contents.length || vectors.length !== docIds.length || vectors.length !== metadataList.length) {
            throw new Error('向量、内容、文档ID和元数据列表的长度必须相同');
        }
        if (vectors.length === 0) {
            logger.warn('尝试插入空的向量数据');
            return 0;
        }

        // 1. 检查知识库是否存在
        const knowledgeBase = await prisma.knowledgeBase.findUnique({
            where: { id: kbId },
        });
        if (!knowledgeBase) {
            throw new Error(`知识库不存在: ${kbId}`);
        }

        // 2. 逐个处理 chunk
        for (let i = 0; i < vectors.length; i++) {
            const currentDocId = docIds[i];
            const metadata = metadataList[i];
            const vector = vectors[i];
            const content = contents[i];
            const uniqueChunkId = metadata.chunkId;

            if (!uniqueChunkId) {
                logger.warn(`Chunk at index ${i} in batch for doc ${currentDocId} is missing chunkId in metadata. Skipping.`);
                continue;
            }

            try {
                // 2.1 检查文档是否存在且属于该知识库
                const document = await prisma.document.findUnique({
                    where: { id: currentDocId, knowledgeBaseId: kbId },
                    select: { id: true }
                });
                if (!document) {
                    logger.warn(`文档 ${currentDocId} 不存在或不属于知识库 ${kbId}，跳过 chunk ${uniqueChunkId}`);
                    continue; // Skip this chunk
                }

                // 2.2 检查 chunk_id 是否已存在
                const existingChunk = await prisma.chunk.findUnique({
                    where: { chunk_id: uniqueChunkId },
                    select: { id: true } // Only need to know if it exists
                });

                if (existingChunk) {
                    logger.info(`Chunk ID ${uniqueChunkId} 已存在，跳过插入。`);
                    continue; // Skip this chunk
                }

                // 2.3 创建不包含向量的记录
                const chunk = await prisma.chunk.create({
                    data: {
                        chunk_id: uniqueChunkId,
                        content_with_weight: content,
                        available_int: 1,
                        doc_id: currentDocId,
                        doc_name: docName, // Consider using document.name if available
                        positions: metadata.positions || { start: i, end: i + 1 },
                        tag_feas: metadata.tag_feas || null,
                        kb_id: kbId,
                        important_kwd: metadata.important_kwd || [],
                        question_kwd: metadata.question_kwd || [],
                        tag_kwd: metadata.tag_kwd || []
                        // id, createdAt, updatedAt, embedding have defaults or are handled next
                    }
                });

                // 2.4 然后更新向量字段
                await prisma.$executeRaw`
                    UPDATE "Chunk"
                    SET embedding = ${Prisma.raw(`'[${vector.join(',')}]'::vector`)}
                    WHERE id = ${chunk.id}
                `;
                createdCount++; // Increment count only if created

            } catch (innerError) {
                // Log error for this specific chunk but continue with others
                logger.error(`处理 chunk ${uniqueChunkId} 失败:`, {
                    error: innerError instanceof Error ? innerError.message : innerError,
                    docId: currentDocId,
                    index: i
                });
                // Optionally re-throw if one failure should stop the whole batch
                // throw innerError;
            }
        }

        logger.info(`向量插入完成，成功创建 ${createdCount} 个 chunk。`);
        return createdCount;

    } catch (error) {
        logger.error('插入向量数据的主流程失败:', {
            kbId,
            error: error instanceof Error ? error.message : '未知错误',
            stack: error instanceof Error ? error.stack : undefined
        });
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            logger.error('Prisma Error Details:', {
                code: error.code,
                meta: error.meta,
                clientVersion: error.clientVersion
            });
        }
        throw error; // Re-throw the main error
    }
}

/**
 * 更新文档块的向量嵌入
 */
export async function updateChunkEmbedding(
    chunkId: string,
    embedding: number[]
) {
    try {
        // 使用原始 SQL 更新向量字段
        await prisma.$executeRaw`
            UPDATE "Chunk"
            SET embedding = ${Prisma.raw(`'[${embedding.join(',')}]'::vector`)}
            WHERE id = ${chunkId}
        `;

        return true;
    } catch (error) {
        logger.error(`更新文档块 ${chunkId} 的向量嵌入失败:`, { error: error instanceof Error ? error.message : error });
        throw error;
    }
} 