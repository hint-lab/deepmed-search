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
        const chunks: DocumentChunk[] = [];
        let chunkIndex = 0;
        let startIndex = 0;

        // 添加保护：如果内容为空，直接返回空数组
        if (!content || content.trim() === '') {
            return chunks;
        }

        while (startIndex < content.length) {
            // 1. 确定理想的结束位置
            let idealEndIndex = Math.min(startIndex + this.options.maxChunkSize, content.length);
            let endIndex = idealEndIndex; // 默认使用理想结束位置

            // 2. 如果不是最后一个块，尝试寻找更好的分割点 (稍微向后查找)
            if (endIndex < content.length) {
                let bestSplitPoint = -1;

                // 优先段落边界 ('\n\n')，在理想点附近查找
                const paragraphSearchStart = Math.max(startIndex, idealEndIndex - 100); // 向前回溯一点开始查找
                const nextParagraph = content.indexOf('\n\n', paragraphSearchStart);
                // 确保找到的段落在合理范围内（不超过理想点太多）
                if (nextParagraph !== -1 && nextParagraph > startIndex && nextParagraph < idealEndIndex + 100) {
                    bestSplitPoint = nextParagraph + 2; // 包含换行符
                }

                // 如果没找到段落，尝试句子边界
                if (bestSplitPoint === -1) {
                    const sentenceEndings = ['. ', '! ', '? ', '。', '！', '？', '；', ';', '\n']; // 添加普通换行符作为句子分隔可能
                    const sentenceSearchStart = Math.max(startIndex, idealEndIndex - 150); // 句子回溯范围可以大一点
                    let bestSentenceEnd = -1;

                    for (const ending of sentenceEndings) {
                        // 从 sentenceSearchStart 开始查找第一个出现的结束符
                        const sentenceEndIndex = content.indexOf(ending, sentenceSearchStart);
                        // 确保找到的位置有效且在合理范围内
                        if (sentenceEndIndex !== -1 && sentenceEndIndex > startIndex && sentenceEndIndex < idealEndIndex + 150) {
                            const potentialEndPoint = sentenceEndIndex + ending.length;
                            // 取最接近 idealEndIndex 但不小于 startIndex + overlapSize 的点
                            if (potentialEndPoint > startIndex + this.options.overlapSize) {
                                if (bestSentenceEnd === -1 || Math.abs(potentialEndPoint - idealEndIndex) < Math.abs(bestSentenceEnd - idealEndIndex)) {
                                    bestSentenceEnd = potentialEndPoint;
                                }
                            }
                        }
                    }
                    if (bestSentenceEnd !== -1) {
                        bestSplitPoint = bestSentenceEnd;
                    }
                }

                // 如果以上都没找到，可以考虑单词边界，但为简化和保证前进，我们优先使用 idealEndIndex
                // 如果需要单词边界：
                // if (bestSplitPoint === -1) {
                //     const wordSearchStart = Math.max(startIndex, idealEndIndex - 50);
                //     const lastSpace = content.lastIndexOf(' ', idealEndIndex);
                //     if (lastSpace !== -1 && lastSpace > wordSearchStart) {
                //         bestSplitPoint = lastSpace + 1;
                //     }
                // }

                // 如果找到了合适的分割点，则使用它，否则坚持用 idealEndIndex
                if (bestSplitPoint !== -1 && bestSplitPoint > startIndex) { // 确保分割点确实前进了
                    endIndex = bestSplitPoint;
                } else {
                    // 未找到合适边界，强制按 idealEndIndex 切割
                    endIndex = idealEndIndex;
                }
            } else {
                // 如果是最后一个块，直接使用内容末尾作为 endIndex
                endIndex = content.length;
            }

            // 提取当前块内容
            const chunkContent = content.substring(startIndex, endIndex).trim();

            // 只有当块内容非空时才添加
            if (chunkContent) {
                chunks.push({
                    id: `${metadata.documentId}-chunk-${chunkIndex}`,
                    content: chunkContent,
                    metadata: {
                        ...metadata,
                        position: chunkIndex,
                        startPosition: startIndex,
                        endPosition: endIndex, // 使用实际的 endIndex
                    },
                });
                chunkIndex++;
            } else if (endIndex === content.length) {
                // 如果到了末尾且内容为空（可能由trim导致），则结束
                break;
            }


            // 3. 更新 startIndex，确保前进
            let nextStartIndex = endIndex - this.options.overlapSize;

            // 如果计算出的 nextStartIndex 没有前进，或者回退过多，则强制前进
            // 强制 startIndex 至少是上一个 endIndex 减去 overlap 再加 1，或者直接就是 endIndex
            // 这里选择更保守的：如果计算出的 nextStartIndex 不比当前 startIndex 大，就直接从 endIndex 开始下一个块（无重叠）
            if (nextStartIndex <= startIndex && endIndex < content.length) {
                // logger.warn(`无法有效重叠，下一个块将从 endIndex (${endIndex}) 开始`, { startIndex, endIndex, overlapSize: this.options.overlapSize });
                startIndex = endIndex; // 直接从当前结束点开始，避免卡住或回退
            } else if (endIndex === content.length) {
                // 如果已经处理到末尾，设置 startIndex 超出长度以结束循环
                startIndex = content.length;
            }
            else {
                startIndex = nextStartIndex;
            }

            // 添加一个保险的循环退出条件（可选，防止极端情况）
            if (chunkIndex > 10000) { // 限制最大块数
                logger.error("分割块数过多，可能存在逻辑问题，强制退出", { documentId: metadata.documentId });
                break;
            }
        }

        return chunks;
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