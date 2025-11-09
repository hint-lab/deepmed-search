"use server"

import { getMilvusClient, ensureCollection, getCollectionName } from './client';
import logger from '@/utils/logger';
import { prisma } from '../prisma';

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

// Milvus 向量插入参数类型
export interface MilvusInsertParams {
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
    bm25Threshold?: number;
    vectorThreshold?: number;
    minSimilarity?: number;
}

/**
 * 搜索相似文档（仅向量搜索）
 */
export async function searchSimilarChunks({
    queryText = '',
    queryVector = [],
    kbId,
    resultLimit = 5,
    filter = '',
    bm25Weight = 0.5,
    vectorWeight = 0.5,
    bm25Threshold = 0.2,
    vectorThreshold = 0.4,
    minSimilarity = 0.25
}: SearchParams) {
    try {
        logger.info('Milvus 搜索参数', { 
            queryText, 
            hasVector: queryVector.length > 0, 
            kbId, 
            resultLimit 
        });

        // 确保集合存在
        await ensureCollection();
        const client = await getMilvusClient();
        const collectionName = await getCollectionName();

        // 如果没有向量，只能使用 BM25（从 PostgreSQL 获取）
        if (!queryVector.length) {
            logger.warn('没有提供向量，使用 BM25 文本搜索');
            return await searchByBM25({
                queryText,
                kbId,
                resultLimit,
                bm25Threshold
            });
        }

        // 构建过滤表达式
        let filterExpr = `kb_id == "${kbId}"`;
        if (filter) {
            filterExpr += ` && ${filter}`;
        }

        console.log('[Milvus] Search filter expression:', filterExpr);
        console.log('[Milvus] Search params:', {
            collection: collectionName,
            vectorDim: queryVector.length,
            resultLimit,
            kbId
        });

        // 执行向量搜索
        const searchResult = await client.search({
            collection_name: collectionName,
            data: [queryVector],
            filter: filterExpr,
            limit: resultLimit,
            output_fields: ['id', 'chunk_id', 'content', 'doc_id', 'doc_name', 'kb_id'],
            params: { nprobe: 10 },
        });

        console.log('[Milvus] Search raw results count:', searchResult.results.length);
        if (searchResult.results.length > 0) {
            console.log('[Milvus] First result sample:', {
                id: searchResult.results[0]?.id,
                chunk_id: searchResult.results[0]?.chunk_id,
                kb_id: searchResult.results[0]?.kb_id,
                distance: searchResult.results[0]?.distance
            });
        }

        logger.info('Milvus 搜索结果', { 
            resultCount: searchResult.results.length,
            filterExpr,
            kbId
        });

        // 获取 chunk_id 列表，从 PostgreSQL 获取完整数据
        const chunkIds = searchResult.results.map((r: any) => r.chunk_id);
        
        console.log('[Milvus] Extracted chunk_ids:', chunkIds.slice(0, 5), `... (total: ${chunkIds.length})`);
        
        if (chunkIds.length === 0) {
            console.log('[Milvus] No chunk_ids extracted from search results');
            return [];
        }

        // 从 PostgreSQL 获取详细信息
        console.log('[Milvus] Querying PostgreSQL with conditions:', {
            chunk_id_count: chunkIds.length,
            kb_id: kbId,
            available_int: 1
        });
        
        const chunks = await prisma.chunk.findMany({
            where: {
                chunk_id: { in: chunkIds },
                kb_id: kbId,
                available_int: 1
            }
        });

        console.log('[Milvus] PostgreSQL returned chunks:', chunks.length);
        
        // 如果没有找到任何 chunks，尝试不加 available_int 过滤
        let finalChunks = chunks;
        if (chunks.length === 0) {
            console.log('[Milvus] Retrying without available_int filter...');
            const chunksWithoutFilter = await prisma.chunk.findMany({
                where: {
                    chunk_id: { in: chunkIds },
                    kb_id: kbId
                }
            });
            console.log('[Milvus] Without filter found:', chunksWithoutFilter.length);
            
            if (chunksWithoutFilter.length > 0) {
                console.log('[Milvus] Using chunks without available_int filter');
                console.log('[Milvus] Sample chunk status:', 
                    chunksWithoutFilter.slice(0, 3).map(c => ({ 
                        id: c.chunk_id, 
                        avail: c.available_int 
                    }))
                );
                finalChunks = chunksWithoutFilter;
            } else {
                // 检查是否是 chunk_id 不匹配的问题
                console.log('[Milvus] Still found 0 chunks in PostgreSQL!');
                console.log('[Milvus] Sample chunk_ids from Milvus:', chunkIds.slice(0, 5));
                
                // 检查这个知识库在 PostgreSQL 中有多少 chunks
                const totalChunksInPg = await prisma.chunk.count({
                    where: { kb_id: kbId }
                });
                console.log(`[Milvus] Total chunks in PostgreSQL for this KB: ${totalChunksInPg}`);
                
                if (totalChunksInPg > 0) {
                    // 获取 PostgreSQL 中的一些 chunk_id 样例
                    const samplePgChunks = await prisma.chunk.findMany({
                        where: { kb_id: kbId },
                        select: { chunk_id: true },
                        take: 5
                    });
                    console.log('[Milvus] Sample chunk_ids from PostgreSQL:', samplePgChunks.map(c => c.chunk_id));
                    console.log('[Milvus] ⚠️ DATA SYNC ISSUE: Milvus has different chunk_ids than PostgreSQL!');
                }
                
                return [];
            }
        }

        // 创建 chunk_id 到 similarity 的映射
        const similarityMap = new Map<string, number>();
        searchResult.results.forEach((r: any) => {
            // Milvus 返回的距离，COSINE 距离范围是 [0, 2]，需要转换为相似度 [0, 1]
            const similarity = 1 - (r.distance || 0) / 2;
            similarityMap.set(r.chunk_id, similarity);
        });

        // 合并结果
        const results = finalChunks
            .map(chunk => {
                const vectorSimilarity = similarityMap.get(chunk.chunk_id) || 0;
                
                // 如果有文本查询，计算 BM25（简化版）
                let bm25Similarity = 0;
                if (queryText) {
                    // 简单的文本匹配计算
                    const content = chunk.content_with_weight.toLowerCase();
                    const query = queryText.toLowerCase();
                    bm25Similarity = content.includes(query) ? 0.5 : 0;
                }

                // 计算综合相似度
                const similarity = vectorSimilarity * vectorWeight + bm25Similarity * bm25Weight;

                return {
                    id: chunk.id,
                    chunk_id: chunk.chunk_id,
                    content_with_weight: chunk.content_with_weight,
                    doc_id: chunk.doc_id,
                    doc_name: chunk.doc_name,
                    positions: JSON.stringify(chunk.positions),
                    tag_feas: chunk.tag_feas ? JSON.stringify(chunk.tag_feas) : '',
                    similarity,
                    bm25_similarity: bm25Similarity,
                    vector_similarity: vectorSimilarity
                } as ChunkSearchResult;
            })
            .filter(r => r.similarity >= minSimilarity)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, resultLimit);

        return results;
    } catch (error) {
        logger.error('搜索相似文档失败', { 
            error: error instanceof Error ? error.message : error 
        });
        throw error;
    }
}

/**
 * BM25 文本搜索（从 PostgreSQL）
 */
async function searchByBM25({
    queryText,
    kbId,
    resultLimit,
    bm25Threshold
}: {
    queryText: string;
    kbId: string;
    resultLimit: number;
    bm25Threshold: number;
}) {
    try {
        // 从 PostgreSQL 获取所有可用的 chunks
        const chunks = await prisma.chunk.findMany({
            where: {
                kb_id: kbId,
                available_int: 1
            },
            take: resultLimit * 5 // 先获取更多候选
        });

        // 简单的文本匹配评分
        const results = chunks
            .map(chunk => {
                const content = chunk.content_with_weight.toLowerCase();
                const query = queryText.toLowerCase();
                
                // 简单的 BM25 近似：包含查询词的次数
                const queryWords = query.split(/\s+/);
                let score = 0;
                queryWords.forEach(word => {
                    const regex = new RegExp(word, 'gi');
                    const matches = content.match(regex);
                    score += matches ? matches.length : 0;
                });
                
                // 归一化分数
                const bm25Similarity = Math.min(score / 10, 1);

                return {
                    id: chunk.id,
                    chunk_id: chunk.chunk_id,
                    content_with_weight: chunk.content_with_weight,
                    doc_id: chunk.doc_id,
                    doc_name: chunk.doc_name,
                    positions: JSON.stringify(chunk.positions),
                    tag_feas: chunk.tag_feas ? JSON.stringify(chunk.tag_feas) : '',
                    similarity: bm25Similarity,
                    bm25_similarity: bm25Similarity,
                    vector_similarity: 0
                } as ChunkSearchResult;
            })
            .filter(r => r.bm25_similarity >= bm25Threshold)
            .sort((a, b) => b.bm25_similarity - a.bm25_similarity)
            .slice(0, resultLimit);

        return results;
    } catch (error) {
        logger.error('BM25 搜索失败', { 
            error: error instanceof Error ? error.message : error 
        });
        throw error;
    }
}

/**
 * 插入向量数据到 Milvus
 */
export async function insertVectors({
    vectors,
    contents,
    docIds,
    metadataList,
    kbId,
    docName
}: MilvusInsertParams): Promise<number> {
    let createdCount = 0;
    try {
        // 检查参数长度是否一致
        if (vectors.length !== contents.length || 
            vectors.length !== docIds.length || 
            vectors.length !== metadataList.length) {
            throw new Error('向量、内容、文档ID和元数据列表的长度必须相同');
        }
        
        if (vectors.length === 0) {
            logger.warn('尝试插入空的向量数据');
            return 0;
        }

        // 确保集合存在
        await ensureCollection();
        const client = await getMilvusClient();
        const collectionName = await getCollectionName();

        // 1. 检查知识库是否存在
        const knowledgeBase = await prisma.knowledgeBase.findUnique({
            where: { id: kbId },
        });
        
        if (!knowledgeBase) {
            throw new Error(`知识库不存在: ${kbId}`);
        }

        // 2. 准备插入数据
        const insertData: any[] = [];
        
        for (let i = 0; i < vectors.length; i++) {
            const currentDocId = docIds[i];
            const metadata = metadataList[i];
            const vector = vectors[i];
            const content = contents[i];
            const uniqueChunkId = metadata.chunkId;

            if (!uniqueChunkId) {
                logger.warn(`Chunk at index ${i} 缺少 chunkId，跳过`);
                continue;
            }

            try {
                // 检查文档是否存在
                const document = await prisma.document.findUnique({
                    where: { id: currentDocId, knowledgeBaseId: kbId },
                    select: { id: true }
                });
                
                if (!document) {
                    logger.warn(`文档 ${currentDocId} 不存在或不属于知识库 ${kbId}，跳过`);
                    continue;
                }

                // 检查 chunk 是否已存在于 PostgreSQL
                const existingChunk = await prisma.chunk.findUnique({
                    where: { chunk_id: uniqueChunkId },
                    select: { id: true }
                });

                if (existingChunk) {
                    logger.info(`Chunk ID ${uniqueChunkId} 已存在，跳过插入`);
                    continue;
                }

                // 在 PostgreSQL 中创建 chunk 记录（不包含 embedding）
                const chunk = await prisma.chunk.create({
                    data: {
                        chunk_id: uniqueChunkId,
                        content_with_weight: content,
                        available_int: 1,
                        doc_id: currentDocId,
                        doc_name: docName,
                        positions: metadata.positions || { start: i, end: i + 1 },
                        tag_feas: metadata.tag_feas || null,
                        kb_id: kbId,
                        important_kwd: metadata.important_kwd || [],
                        question_kwd: metadata.question_kwd || [],
                        tag_kwd: metadata.tag_kwd || []
                    }
                });

                // 准备 Milvus 数据
                insertData.push({
                    id: chunk.id,
                    chunk_id: uniqueChunkId,
                    content: content,
                    doc_id: currentDocId,
                    doc_name: docName,
                    kb_id: kbId,
                    embedding: vector
                });

                createdCount++;
            } catch (innerError) {
                logger.error(`处理 chunk ${uniqueChunkId} 失败`, {
                    error: innerError instanceof Error ? innerError.message : innerError,
                    docId: currentDocId,
                    index: i
                });
            }
        }

        // 3. 批量插入到 Milvus
        if (insertData.length > 0) {
            await client.insert({
                collection_name: collectionName,
                data: insertData,
            });

            logger.info('向量插入 Milvus 完成', { count: insertData.length });
        }

        logger.info(`向量插入完成，成功创建 ${createdCount} 个 chunk`);
        return createdCount;

    } catch (error) {
        logger.error('插入向量数据失败', {
            kbId,
            error: error instanceof Error ? error.message : '未知错误',
            stack: error instanceof Error ? error.stack : undefined
        });
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
        // 从 PostgreSQL 获取 chunk 信息
        const chunk = await prisma.chunk.findUnique({
            where: { id: chunkId }
        });

        if (!chunk) {
            throw new Error(`Chunk ${chunkId} 不存在`);
        }

        // 更新 Milvus 中的向量
        await ensureCollection();
        const client = await getMilvusClient();
        const collectionName = await getCollectionName();

        // 先删除旧的
        await client.delete({
            collection_name: collectionName,
            filter: `id == "${chunkId}"`
        });

        // 插入新的
        await client.insert({
            collection_name: collectionName,
            data: [{
                id: chunkId,
                chunk_id: chunk.chunk_id,
                content: chunk.content_with_weight,
                doc_id: chunk.doc_id,
                doc_name: chunk.doc_name,
                kb_id: chunk.kb_id,
                embedding: embedding
            }]
        });

        logger.info('更新 chunk embedding 成功', { chunkId });
        return true;
    } catch (error) {
        logger.error(`更新文档块 ${chunkId} 的向量嵌入失败`, { 
            error: error instanceof Error ? error.message : error 
        });
        throw error;
    }
}

/**
 * 删除知识库的所有向量
 */
export async function deleteKnowledgeBaseVectors(kbId: string): Promise<boolean> {
    try {
        await ensureCollection();
        const client = await getMilvusClient();
        const collectionName = await getCollectionName();

        await client.delete({
            collection_name: collectionName,
            filter: `kb_id == "${kbId}"`
        });

        logger.info('删除知识库向量成功', { kbId });
        return true;
    } catch (error) {
        logger.error('删除知识库向量失败', { 
            error: error instanceof Error ? error.message : error,
            kbId 
        });
        return false;
    }
}

/**
 * 删除文档的所有向量
 */
export async function deleteDocumentVectors(docId: string): Promise<boolean> {
    try {
        await ensureCollection();
        const client = await getMilvusClient();
        const collectionName = await getCollectionName();

        await client.delete({
            collection_name: collectionName,
            filter: `doc_id == "${docId}"`
        });

        logger.info('删除文档向量成功', { docId });
        return true;
    } catch (error) {
        logger.error('删除文档向量失败', { 
            error: error instanceof Error ? error.message : error,
            docId 
        });
        return false;
    }
}

