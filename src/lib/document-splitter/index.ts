import logger from '@/utils/logger';

/**
 * 文档分割选项
 */
export interface DocumentSplitterOptions {
    /**
     * 每个块的最大字符数
     */
    maxChunkSize?: number;

    /**
     * 块之间的重叠字符数
     */
    overlapSize?: number;

    /**
     * 是否按段落分割
     */
    splitByParagraph?: boolean;

    /**
     * 是否保留原始格式
     */
    preserveFormat?: boolean;
}

/**
 * 文档块
 */
export interface DocumentChunk {
    /**
     * 块ID
     */
    id: string;

    /**
     * 块内容
     */
    content: string;

    /**
     * 块元数据
     */
    metadata: {
        /**
         * 文档ID
         */
        documentId: string;

        /**
         * 文档名称
         */
        documentName: string;

        /**
         * 页码
         */
        pageNumber?: number;

        /**
         * 块在文档中的位置
         */
        position?: number;

        /**
         * 块在文档中的起始位置
         */
        startPosition?: number;

        /**
         * 块在文档中的结束位置
         */
        endPosition?: number;

        /**
         * 其他元数据
         */
        [key: string]: any;
    };
}

/**
 * 文档分割器类
 */
export class DocumentSplitter {
    private options: Required<DocumentSplitterOptions>;

    constructor(options: DocumentSplitterOptions = {}) {
        this.options = {
            maxChunkSize: options.maxChunkSize || 1000,
            overlapSize: options.overlapSize || 200,
            splitByParagraph: options.splitByParagraph !== undefined ? options.splitByParagraph : true,
            preserveFormat: options.preserveFormat !== undefined ? options.preserveFormat : false,
        };
    }

    /**
     * 分割文档内容
     * @param content 文档内容
     * @param metadata 文档元数据
     * @returns 文档块数组
     */
    public splitDocument(
        content: string,
        metadata: {
            documentId: string;
            documentName: string;
            [key: string]: any;
        }
    ): DocumentChunk[] {
        try {
            if (!content || content.trim() === '') {
                logger.warn('尝试分割空文档内容');
                return [];
            }

            // 如果按段落分割
            if (this.options.splitByParagraph) {
                return this.splitByParagraph(content, metadata);
            }

            // 否则按固定大小分割
            return this.splitBySize(content, metadata);
        } catch (error) {
            logger.error('分割文档失败', {
                error: error instanceof Error ? error.message : '未知错误',
                documentId: metadata.documentId,
            });
            throw error;
        }
    }

    /**
     * 按段落分割文档
     * @param content 文档内容
     * @param metadata 文档元数据
     * @returns 文档块数组
     */
    private splitByParagraph(
        content: string,
        metadata: {
            documentId: string;
            documentName: string;
            [key: string]: any;
        }
    ): DocumentChunk[] {
        // 分割段落
        const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim() !== '');

        const chunks: DocumentChunk[] = [];
        let currentChunk = '';
        let chunkStartPosition = 0;
        let chunkIndex = 0;

        for (let i = 0; i < paragraphs.length; i++) {
            const paragraph = paragraphs[i];

            // 如果当前块加上新段落超过最大块大小，创建新块
            if (currentChunk.length + paragraph.length > this.options.maxChunkSize && currentChunk.length > 0) {
                chunks.push({
                    id: `${metadata.documentId}-chunk-${chunkIndex}`,
                    content: currentChunk,
                    metadata: {
                        ...metadata,
                        position: chunkIndex,
                        startPosition: chunkStartPosition,
                        endPosition: chunkStartPosition + currentChunk.length,
                    },
                });

                // 重置当前块，保留重叠部分
                const overlapText = this.getOverlapText(currentChunk);
                currentChunk = overlapText;
                chunkStartPosition = chunkStartPosition + currentChunk.length - overlapText.length;
                chunkIndex++;
            }

            // 添加段落到当前块
            currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }

        // 添加最后一个块
        if (currentChunk.length > 0) {
            chunks.push({
                id: `${metadata.documentId}-chunk-${chunkIndex}`,
                content: currentChunk,
                metadata: {
                    ...metadata,
                    position: chunkIndex,
                    startPosition: chunkStartPosition,
                    endPosition: chunkStartPosition + currentChunk.length,
                },
            });
        }

        return chunks;
    }

    /**
     * 按固定大小分割文档
     * @param content 文档内容
     * @param metadata 文档元数据
     * @returns 文档块数组
     */
    private splitBySize(
        content: string,
        metadata: {
            documentId: string;
            documentName: string;
            [key: string]: any;
        }
    ): DocumentChunk[] {
        const chunks: DocumentChunk[] = [];
        let startIndex = 0;
        let chunkIndex = 0;

        while (startIndex < content.length) {
            // 计算当前块的结束位置
            let endIndex = startIndex + this.options.maxChunkSize;

            // 如果结束位置超过内容长度，设置为内容长度
            if (endIndex > content.length) {
                endIndex = content.length;
            } else {
                // 尝试在段落边界分割
                const nextParagraph = content.indexOf('\n\n', startIndex + this.options.maxChunkSize - 100);
                if (nextParagraph > startIndex && nextParagraph < endIndex + 100) {
                    endIndex = nextParagraph;
                } else {
                    // 尝试在句子边界分割
                    const sentenceEndings = ['. ', '! ', '? ', '。', '！', '？', '；', ';'];
                    let bestSentenceEnd = -1;

                    for (const ending of sentenceEndings) {
                        const nextSentence = content.indexOf(ending, startIndex + this.options.maxChunkSize - 50);
                        if (nextSentence > startIndex && nextSentence < endIndex + 50) {
                            if (bestSentenceEnd === -1 || nextSentence < bestSentenceEnd) {
                                bestSentenceEnd = nextSentence + ending.length;
                            }
                        }
                    }

                    if (bestSentenceEnd !== -1) {
                        endIndex = bestSentenceEnd;
                    } else {
                        // 如果找不到句子边界，尝试在单词边界分割
                        const lastSpace = content.lastIndexOf(' ', endIndex);
                        if (lastSpace > startIndex + this.options.maxChunkSize * 0.8) {
                            endIndex = lastSpace;
                        } else {
                            // 如果找不到合适的单词边界，尝试在标点符号处分割
                            const punctuationMarks = [',', '，', '、', '：', ':', '；', ';'];
                            let bestPunctuation = -1;

                            for (const mark of punctuationMarks) {
                                const nextMark = content.lastIndexOf(mark, endIndex);
                                if (nextMark > startIndex + this.options.maxChunkSize * 0.8) {
                                    if (bestPunctuation === -1 || nextMark > bestPunctuation) {
                                        bestPunctuation = nextMark + 1;
                                    }
                                }
                            }

                            if (bestPunctuation !== -1) {
                                endIndex = bestPunctuation;
                            }
                        }
                    }
                }
            }

            // 提取当前块内容
            const chunkContent = content.substring(startIndex, endIndex).trim();

            // 创建块
            chunks.push({
                id: `${metadata.documentId}-chunk-${chunkIndex}`,
                content: chunkContent,
                metadata: {
                    ...metadata,
                    position: chunkIndex,
                    startPosition: startIndex,
                    endPosition: endIndex,
                },
            });

            // 更新下一个块的起始位置，考虑重叠
            startIndex = endIndex - this.options.overlapSize;
            chunkIndex++;

            // 如果已经到达内容末尾，退出循环
            if (startIndex >= content.length) {
                break;
            }
        }

        return chunks;
    }

    /**
     * 获取重叠文本
     * @param text 文本内容
     * @returns 重叠文本
     */
    private getOverlapText(text: string): string {
        if (text.length <= this.options.overlapSize) {
            return text;
        }

        return text.substring(text.length - this.options.overlapSize);
    }
} 