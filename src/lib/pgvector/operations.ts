"use server"

import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';
import { VECTOR_DIMENSIONS } from './client';

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
export async function searchSimilarDocuments(
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
        console.error('搜索相似文档失败:', error);
        throw error;
    }
}

/**
 * 插入向量数据
 */
export async function insertVectors({
    vectors,
    contents,
    docIds,
    metadataList,
    kbId,
    docName
}: PgVectorInsertParams) {
    try {
        // 检查参数长度是否一致
        if (vectors.length !== contents.length || vectors.length !== docIds.length || vectors.length !== metadataList.length) {
            throw new Error('向量、内容和文档ID的长度必须相同');
        }

        // 1. 检查知识库是否存在
        const knowledgeBase = await prisma.knowledgeBase.findUnique({
            where: { id: kbId },
        });
        if (!knowledgeBase) {
            throw new Error(`知识库不存在: ${kbId}`);
        }

        // 2. 批量创建 Chunk 并更新向量
        const chunks = await Promise.all(vectors.map(async (vector, i) => {
            const currentDocId = docIds[i];

            // 2.1 检查文档是否存在且属于该知识库
            const document = await prisma.document.findUnique({
                where: { id: currentDocId, knowledgeBaseId: kbId },
            });
            if (!document) {
                console.warn(`文档 ${currentDocId} 不存在或不属于知识库 ${kbId}，跳过 chunk ${i}`);
                return null; // 跳过这个 chunk
            }

            // 2.2 创建不包含向量的记录
            const chunk = await prisma.chunk.create({
                data: {
                    chunk_id: `chunk_${currentDocId}_${i}`,
                    content_with_weight: contents[i],
                    available_int: 1,
                    doc_id: currentDocId,
                    doc_name: docName, // 考虑是否应该从 document 对象获取 docName
                    positions: { start: i, end: i + 1 },
                    tag_feas: metadataList[i],
                    kb_id: kbId,
                    important_kwd: [],
                    question_kwd: [],
                    tag_kwd: []
                }
            });

            // 2.3 然后更新向量字段
            await prisma.$executeRaw`
                UPDATE "Chunk"
                SET embedding = ${Prisma.raw(`'[${vector.join(',')}]'::vector`)}
                WHERE id = ${chunk.id}
            `;

            return chunk;
        }));

        // 过滤掉因为文档不存在而被跳过的 null 值
        const successfulChunks = chunks.filter(chunk => chunk !== null);

        return successfulChunks.length;
    } catch (error) {
        console.error('插入向量数据失败:', error);
        // 如果是 Prisma 已知错误，可以提供更具体的错误信息
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            console.error('Prisma Error Code:', error.code);
            console.error('Prisma Error Meta:', error.meta);
        }
        throw error;
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
        console.error(`更新文档块 ${chunkId} 的向量嵌入失败:`, error);
        throw error;
    }
} 