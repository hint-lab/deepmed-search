import axios from 'axios';
import logger from '@/utils/logger';
import { DocumentChunk } from './index';
import { prisma } from '@/lib/prisma';
import { decryptApiKey } from '@/lib/crypto';

/**
 * Jina 分块器选项
 */
export interface JinaSegmenterOptions {
    /**
     * 用户ID（必需，用于获取 Jina API Key）
     */
    userId: string;

    /**
     * 每个块的最大字符数
     */
    maxChunkLength?: number;

    /**
     * 文档元数据
     */
    metadata: {
        documentId: string;
        documentName: string;
        [key: string]: any;
    };
}

/**
 * Jina 分块器
 * 使用 Jina AI API 进行智能分块
 */
export class JinaSegmenter {
    private userId: string;
    private maxChunkLength: number;
    private metadata: JinaSegmenterOptions['metadata'];

    constructor(options: JinaSegmenterOptions) {
        this.userId = options.userId;
        this.maxChunkLength = options.maxChunkLength || 500;
        this.metadata = options.metadata;
    }

    /**
     * 使用 Jina API 分块文档
     */
    async segment(content: string): Promise<DocumentChunk[]> {
        if (!content.trim()) {
            return [];
        }

        // 获取用户的 Jina API Key
        const jinaApiKey = await this.getJinaApiKey();

        // Maximum size to send in a single API request (slightly under 64K to be safe)
        const MAX_BATCH_SIZE = 60000;

        // Split content into batches
        const batches = this.splitTextIntoBatches(content, MAX_BATCH_SIZE);
        logger.info(`[JinaSegmenter] 将内容分割为 ${batches.length} 个批次`, {
            documentId: this.metadata.documentId,
            contentLength: content.length,
            batchCount: batches.length,
        });

        // Calculate offsets for each batch upfront
        const batchOffsets: number[] = [];
        let currentOffset = 0;
        for (const batch of batches) {
            batchOffsets.push(currentOffset);
            currentOffset += batch.length;
        }

        // Process all batches in parallel
        const batchPromises = batches.map(async (batch, i) => {
            logger.info(`[JinaSegmenter] 处理批次 ${i + 1}/${batches.length}`, {
                documentId: this.metadata.documentId,
                batchIndex: i,
                batchSize: batch.length,
            });

            try {
                const { data } = await axios.post(
                    'https://api.jina.ai/v1/segment',
                    {
                        content: batch,
                        return_chunks: true,
                        max_chunk_length: this.maxChunkLength,
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${jinaApiKey}`,
                        },
                        timeout: 30000, // 30秒超时
                        responseType: 'json',
                    }
                );

                if (!data) {
                    throw new Error('Invalid response data from Jina API');
                }

                logger.info(`[JinaSegmenter] 批次 ${i + 1} 完成`, {
                    documentId: this.metadata.documentId,
                    batchIndex: i,
                    numChunks: data.num_chunks,
                    numTokens: data.num_tokens,
                });

                // Get the batch offset
                const offset = batchOffsets[i];

                // Adjust chunk positions to account for the offset of this batch
                const adjustedPositions = data.chunk_positions
                    ? data.chunk_positions.map((position: [number, number]) => {
                        return [position[0] + offset, position[1] + offset] as [number, number];
                    })
                    : [];

                return {
                    chunks: data.chunks || [],
                    positions: adjustedPositions,
                    tokens: data.usage?.tokens || 0,
                };
            } catch (error) {
                this.handleSegmentationError(error, i);
            }
        });

        // Wait for all batches to complete
        const batchResults = await Promise.all(batchPromises);

        // Aggregate results and convert to DocumentChunk format
        const allChunks: DocumentChunk[] = [];
        let chunkIndex = 0;

        for (const result of batchResults) {
            const positions = result.positions;

            for (let j = 0; j < result.chunks.length; j++) {
                const chunkContent = result.chunks[j];
                const position = positions[j] || [0, chunkContent.length];

                allChunks.push({
                    id: `${this.metadata.documentId}-chunk-${chunkIndex}`,
                    content: chunkContent,
                    metadata: {
                        ...this.metadata,
                        position: chunkIndex,
                        startPosition: position[0],
                        endPosition: position[1],
                    },
                });
                chunkIndex++;
            }
        }

        logger.info(`[JinaSegmenter] 分块完成`, {
            documentId: this.metadata.documentId,
            totalChunks: allChunks.length,
        });

        return allChunks;
    }

    /**
     * 获取用户的 Jina API Key
     */
    private async getJinaApiKey(): Promise<string> {
        try {
            const userConfig = await prisma.searchConfig.findUnique({
                where: { userId: this.userId },
                select: { jinaApiKey: true },
            });

            if (!userConfig || !userConfig.jinaApiKey) {
                throw new Error(
                    '未配置 Jina API Key。请访问 /settings/search 页面配置您的 Jina API Key'
                );
            }

            return decryptApiKey(userConfig.jinaApiKey);
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('获取 Jina API Key 失败');
        }
    }

    /**
     * Splits text into batches that fit within the specified size limit
     * Tries to split at paragraph boundaries when possible
     */
    private splitTextIntoBatches(text: string, maxBatchSize: number): string[] {
        const batches: string[] = [];
        let currentIndex = 0;

        while (currentIndex < text.length) {
            if (currentIndex + maxBatchSize >= text.length) {
                // If the remaining text fits in one batch, add it and we're done
                batches.push(text.slice(currentIndex));
                break;
            }

            // Find a good split point - preferably at a paragraph break
            // Look for the last paragraph break within the max batch size
            let endIndex = currentIndex + maxBatchSize;

            // Try to find paragraph breaks (double newline)
            const paragraphBreakIndex = text.lastIndexOf('\n\n', endIndex);
            if (paragraphBreakIndex > currentIndex && paragraphBreakIndex <= endIndex - 10) {
                // Found a paragraph break that's at least 10 chars before the max size
                // This avoids tiny splits at the end of a batch
                endIndex = paragraphBreakIndex + 2; // Include the double newline
            } else {
                // If no paragraph break, try a single newline
                const newlineIndex = text.lastIndexOf('\n', endIndex);
                if (newlineIndex > currentIndex && newlineIndex <= endIndex - 5) {
                    endIndex = newlineIndex + 1; // Include the newline
                } else {
                    // If no newline, try a sentence break
                    const sentenceBreakIndex = this.findLastSentenceBreak(text, currentIndex, endIndex);
                    if (sentenceBreakIndex > currentIndex) {
                        endIndex = sentenceBreakIndex;
                    }
                    // If no sentence break found, we'll just use the max batch size
                }
            }

            batches.push(text.slice(currentIndex, endIndex));
            currentIndex = endIndex;
        }

        return batches;
    }

    /**
     * Finds the last sentence break (period, question mark, or exclamation point followed by space)
     * within the given range
     */
    private findLastSentenceBreak(text: string, startIndex: number, endIndex: number): number {
        // Look for ". ", "? ", or "! " patterns
        for (let i = endIndex; i > startIndex; i--) {
            if (
                (text[i - 2] === '.' || text[i - 2] === '?' || text[i - 2] === '!') &&
                text[i - 1] === ' '
            ) {
                return i;
            }
        }
        return -1; // No sentence break found
    }

    /**
     * Handles errors from the segmentation API
     */
    private handleSegmentationError(error: any, batchIndex: number): never {
        if (axios.isAxiosError(error)) {
            if (error.response) {
                const status = error.response.status;
                const errorData = error.response.data;

                if (status === 402) {
                    throw new Error(
                        errorData?.readableMessage ||
                        'Jina API 余额不足。请访问 /settings/search 检查您的账户'
                    );
                }
                if (status === 401) {
                    throw new Error(
                        'Jina API Key 无效。请访问 /settings/search 页面重新配置您的 API Key'
                    );
                }
                throw new Error(
                    errorData?.readableMessage || `Jina API 错误 (HTTP ${status})`
                );
            } else if (error.request) {
                throw new Error('无法连接到 Jina API 服务器');
            } else {
                throw new Error(`请求失败: ${error.message}`);
            }
        }
        throw error;
    }
}

