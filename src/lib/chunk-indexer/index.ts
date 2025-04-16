import { DocumentChunk } from '../document-splitter';
import { getEmbeddings } from '../openai/embedding';
import { insertVectors } from '../milvus/operations';
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
     * Milvus集合名称
     */
    collectionName?: string;

    /**
     * 批处理大小
     */
    batchSize?: number;
}

/**
 * 文档块索引器类
 */
export class ChunkIndexer {
    private options: Required<ChunkIndexerOptions>;

    constructor(options: ChunkIndexerOptions = {}) {
        this.options = {
            embeddingModel: options.embeddingModel || 'text-embedding-3-small',
            collectionName: options.collectionName || 'documents',
            batchSize: options.batchSize || 10,
        };
    }

    /**
     * 索引文档块
     * @param chunks 文档块数组
     * @returns 索引结果
     */
    public async indexChunks(chunks: DocumentChunk[]): Promise<{
        success: boolean;
        indexedCount: number;
        error?: string;
    }> {
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
                collectionName: this.options.collectionName,
            });

            // 准备批处理
            const batches = this.prepareBatches(chunks);
            let indexedCount = 0;

            // 处理每个批次
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                logger.info(`处理批次 ${i + 1}/${batches.length}`, {
                    batchSize: batch.length,
                });

                // 获取嵌入向量
                const contents = batch.map(chunk => chunk.content);
                const vectors = await getEmbeddings(contents, this.options.embeddingModel);

                // 准备元数据
                const docIds = batch.map(chunk => chunk.metadata.documentId);
                const metadataList = batch.map(chunk => ({
                    ...chunk.metadata,
                    chunkId: chunk.id,
                }));

                // 插入向量
                await insertVectors({
                    collectionName: this.options.collectionName,
                    vectors,
                    contents,
                    docIds,
                    metadataList,
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
            };
        } catch (error) {
            logger.error('索引文档块失败', {
                error: error instanceof Error ? error.message : '未知错误',
                chunkCount: chunks.length,
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