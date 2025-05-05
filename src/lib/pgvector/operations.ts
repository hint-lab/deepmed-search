"use server"

import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';
import { VECTOR_DIMENSIONS } from './client';
import logger from '@/utils/logger';

// 定义查询结果类型
interface SearchResult {
    id: string;
    chunk_id: string;
    content_with_weight: string;
    doc_id: string;
    doc_name: string;
    positions: string;
    tag_feas: string;
    distance: number;
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

/**
 * 搜索相似文档
 */
export async function searchSimilarChunks(
    queryVector: number[],
    kbId: string,
    resultLimit = 5,
    filter = ''
) {
    try {
        // 构建 SQL 查询
        let sqlQuery = Prisma.sql`
            SELECT 
                c.id, 
                c.chunk_id, 
                c.content_with_weight, 
                c.doc_id, 
                c.doc_name, 
                c.positions, 
                c.tag_feas,
                c.embedding <-> ${Prisma.raw(`'[${queryVector.join(',')}]'::vector`)} as distance
            FROM "Chunk" c
            WHERE c.kb_id = ${kbId}
            AND c.available_int = 1
        `;

        // 添加过滤条件（如果有）
        if (filter) {
            sqlQuery = Prisma.sql`${sqlQuery} AND ${Prisma.raw(filter)}`;
        }

        // 添加排序和限制
        sqlQuery = Prisma.sql`
            ${sqlQuery}
            ORDER BY distance ASC
            LIMIT ${resultLimit}
        `;

        // 执行查询
        const results = await prisma.$queryRaw<SearchResult[]>(sqlQuery);

        // 格式化结果
        return results.map(result => ({
            id: result.id,
            chunk_id: result.chunk_id,
            content: result.content_with_weight,
            doc_id: result.doc_id,
            doc_name: result.doc_name,
            positions: result.positions,
            tag_feas: result.tag_feas,
            distance: result.distance
        }));
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