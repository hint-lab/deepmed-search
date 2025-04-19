import { DocumentChunk } from '../document-splitter';
import { getEmbeddings } from '../openai/embedding';
import { insertVectors } from '../pgvector/operations';
import logger from '@/utils/logger';

/**
 * 文档块索引选项
 */
export interface ChunkIndexerOptions {
    /**
     * 嵌入模型名称
     */
    embeddingModel?: string;

    /**
     * 知识库ID
     */
    kbId?: string;

    /**
     * 批处理大小
     */
    batchSize?: number;
}

/**
 * 文档块索引器类
 */
export class ChunkIndexer {
    private options: Partial<ChunkIndexerOptions> & { embeddingModel: string; batchSize: number; kbId?: string };

    constructor(options: ChunkIndexerOptions = {}) {
        this.options = {
            embeddingModel: options.embeddingModel || 'text-embedding-3-small',
            batchSize: options.batchSize || 10,
            kbId: options.kbId
        };

        if (!this.options.kbId) {
            logger.warn('ChunkIndexer 初始化时缺少 kbId');
        }
    }

    /**
     * 索引文档块
     * @param chunks 文档块数组
     * @returns 索引结果，包含第一个批次的 embedding
     */
    public async indexChunks(chunks: DocumentChunk[]): Promise<{
        success: boolean;
        indexedCount: number;
        embeddings?: number[][];
        error?: string;
    }> {
        if (!this.options.kbId) {
            logger.error('无法执行索引，ChunkIndexer 的 kbId 未设置');
            return { success: false, indexedCount: 0, error: '内部错误：知识库 ID 未设置' };
        }

        try {
            if (!chunks || chunks.length === 0) {
                logger.warn('尝试索引空文档块数组');
                return {
                    success: true,
                    indexedCount: 0,
                };
            }

            logger.info('开始索引文档块', {
                chunkCount: chunks.length,
                kbId: this.options.kbId,
            });

            // 准备批处理
            const batches = this.prepareBatches(chunks);
            let indexedCount = 0;
            let firstBatchEmbeddings: number[][] | undefined = undefined;

            // 处理每个批次
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                logger.info(`处理批次 ${i + 1}/${batches.length}`, {
                    batchSize: batch.length,
                });

                // 获取嵌入向量
                const contents = batch.map(chunk => chunk.content);
                const vectors = await getEmbeddings(contents, this.options.embeddingModel);

                // Store embeddings from the first batch
                if (i === 0) {
                    firstBatchEmbeddings = vectors;
                }

                // 准备元数据
                const docIds = batch.map(chunk => chunk.metadata.documentId);
                const metadataList = batch.map(chunk => ({
                    ...chunk.metadata,
                    chunkId: chunk.id,
                }));

                // 插入向量
                await insertVectors({
                    vectors,
                    contents,
                    docIds,
                    metadataList,
                    kbId: this.options.kbId!,
                    docName: batch[0].metadata.documentName || '未知文档',
                });

                indexedCount += batch.length;
                logger.info(`批次 ${i + 1} 索引完成`, {
                    indexedCount,
                    totalCount: chunks.length,
                });
            }

            logger.info('文档块索引完成', {
                indexedCount,
                totalCount: chunks.length,
            });

            return {
                success: true,
                indexedCount,
                embeddings: firstBatchEmbeddings
            };
        } catch (error) {
            logger.error('索引文档块失败', {
                error: error instanceof Error ? error.message : '未知错误',
                chunkCount: chunks.length,
                kbId: this.options.kbId,
            });

            return {
                success: false,
                indexedCount: 0,
                error: error instanceof Error ? error.message : '索引文档块失败',
            };
        }
    }

    /**
     * 准备批处理
     * @param chunks 文档块数组
     * @returns 批处理数组
     */
    private prepareBatches(chunks: DocumentChunk[]): DocumentChunk[][] {
        const batches: DocumentChunk[][] = [];

        for (let i = 0; i < chunks.length; i += this.options.batchSize) {
            batches.push(chunks.slice(i, i + this.options.batchSize));
        }

        return batches;
    }
} 