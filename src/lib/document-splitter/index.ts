import logger from '@/utils/logger';
import { JinaSegmenter } from './jina-segmenter';
import { LLMSegmenter } from './llm-segmenter';

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

    /**
     * 分块模式：
     * - rule_segmentation: 基于规则的分块
     * - llm_segmentation: 使用用户配置的 LLM 进行智能分块
     * - jina_segmentation: 使用 Jina AI API 进行智能分块
     */
    parserMode?: 'llm_segmentation' | 'rule_segmentation' | 'jina_segmentation';

    /**
     * 用户ID（智能分块时必需）
     */
    userId?: string;

    /**
     * 解析器配置（JSON格式，可能包含自定义 prompt 等）
     */
    parserConfig?: any;
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

    private userId?: string;
    private parserConfig?: any;

    constructor(options: DocumentSplitterOptions = {}) {
        // 智能分块时，自动忽略 overlapSize
        const isSmartSegmentation = options.parserMode === 'llm_segmentation' || options.parserMode === 'jina_segmentation';
        const effectiveOverlapSize = isSmartSegmentation ? 0 : (options.overlapSize || 200);

        this.options = {
            // 增大默认分块大小到2000字符，减少分块数量
            maxChunkSize: options.maxChunkSize || 2000,
            overlapSize: effectiveOverlapSize,
            splitByParagraph: options.splitByParagraph !== undefined ? options.splitByParagraph : true,
            preserveFormat: options.preserveFormat !== undefined ? options.preserveFormat : false,
            parserMode: options.parserMode || 'rule_segmentation',
        };

        this.userId = options.userId;
        this.parserConfig = options.parserConfig;
    }

    /**
     * 检测位置是否在 Markdown 表格内
     * 表格格式示例：
     * | Header 1 | Header 2 |
     * |----------|----------|
     * | Cell 1   | Cell 2   |
     */
    private isInsideTable(content: string, position: number): boolean {
        // 向前查找最近的表格开始标记
        const beforeContent = content.substring(Math.max(0, position - 1000), position);
        const afterContent = content.substring(position, Math.min(content.length, position + 1000));

        // 检查是否在表格行中（包含 | 分隔符的行）
        const beforeLines = beforeContent.split('\n');
        const afterLines = afterContent.split('\n');

        // 如果前后都有表格标记，说明可能在表格内
        const hasTableBefore = beforeLines.some(line => line.trim().startsWith('|') && line.includes('|'));
        const hasTableAfter = afterLines.some(line => line.trim().startsWith('|') && line.includes('|'));

        return hasTableBefore && hasTableAfter;
    }

    /**
     * 检测位置是否在链接内
     * Markdown 链接格式：[文本](URL) 或 <URL>
     */
    private isInsideLink(content: string, position: number): boolean {
        const beforeContent = content.substring(Math.max(0, position - 200), position);
        const afterContent = content.substring(position, Math.min(content.length, position + 200));

        // 检查 Markdown 链接格式 [text](url)
        const unclosedBracket = beforeContent.lastIndexOf('[');
        const closedBracket = beforeContent.lastIndexOf(']');
        if (unclosedBracket > closedBracket) {
            const hasClosingParens = afterContent.includes(')');
            if (hasClosingParens) return true;
        }

        // 检查 HTML 链接格式 <a href="url">
        const unclosedTag = beforeContent.lastIndexOf('<a ');
        const closedTag = beforeContent.lastIndexOf('</a>');
        if (unclosedTag > closedTag) {
            const hasClosingTag = afterContent.includes('</a>');
            if (hasClosingTag) return true;
        }

        // 检查简单 URL 格式 <URL>
        const unclosedAngle = beforeContent.lastIndexOf('<');
        const closedAngle = beforeContent.lastIndexOf('>');
        if (unclosedAngle > closedAngle) {
            const hasClosingAngle = afterContent.includes('>');
            const isUrl = beforeContent.substring(unclosedAngle).match(/^<https?:\/\//);
            if (hasClosingAngle && isUrl) return true;
        }

        return false;
    }

    /**
     * 在大模型模式下，查找安全的分割点（避开表格和链接）
     */
    private findSafeSplitPoint(content: string, idealPosition: number, searchRange: number = 500): number {
        // 如果不是大模型模式，直接返回原位置
        if (this.options.parserMode !== 'llm_segmentation') {
            return idealPosition;
        }

        // 如果当前位置安全，直接使用
        if (!this.isInsideTable(content, idealPosition) && !this.isInsideLink(content, idealPosition)) {
            return idealPosition;
        }

        // 向后搜索安全位置
        for (let offset = 0; offset < searchRange; offset += 10) {
            const testPos = idealPosition + offset;
            if (testPos >= content.length) break;

            if (!this.isInsideTable(content, testPos) && !this.isInsideLink(content, testPos)) {
                // 找到安全位置后，再找最近的段落边界
                const nextParagraph = content.indexOf('\n\n', testPos);
                if (nextParagraph !== -1 && nextParagraph < testPos + 200) {
                    return nextParagraph + 2;
                }
                return testPos;
            }
        }

        // 如果向后找不到，返回原位置（最后的保险）
        return idealPosition;
    }

    /**
     * 分割文档内容
     * @param content 文档内容
     * @param metadata 文档元数据
     * @returns 文档块数组
     */
    public async splitDocument(
        content: string,
        metadata: {
            documentId: string;
            documentName: string;
            [key: string]: any;
        }
    ): Promise<DocumentChunk[]> {
        // 添加保护：如果内容为空，直接返回空数组
        if (!content || content.trim() === '') {
            return [];
        }

        // 根据 parserMode 选择分块方式
        if (this.options.parserMode === 'jina_segmentation') {
            return this.splitWithJina(content, metadata);
        }

        if (this.options.parserMode === 'llm_segmentation') {
            return this.splitWithLLM(content, metadata);
        }

        // 默认使用规则分块
        return this.splitWithRule(content, metadata);
    }

    /**
     * 使用 Jina API 进行智能分块
     */
    private async splitWithJina(
        content: string,
        metadata: {
            documentId: string;
            documentName: string;
            [key: string]: any;
        }
    ): Promise<DocumentChunk[]> {
        if (!this.userId) {
            throw new Error('使用 Jina 分块需要提供 userId');
        }

        const jinaMaxChunkLength = this.parserConfig?.jina_max_chunk_length || 500;
        const segmenter = new JinaSegmenter({
            userId: this.userId,
            maxChunkLength: jinaMaxChunkLength,
            metadata,
        });

        return await segmenter.segment(content);
    }

    /**
     * 使用 LLM 进行智能分块
     */
    private async splitWithLLM(
        content: string,
        metadata: {
            documentId: string;
            documentName: string;
            [key: string]: any;
        }
    ): Promise<DocumentChunk[]> {
        if (!this.userId) {
            throw new Error('使用 LLM 分块需要提供 userId');
        }

        const customPrompt = this.parserConfig?.llm_chunk_prompt;
        const segmenter = new LLMSegmenter({
            userId: this.userId,
            maxChunkSize: this.options.maxChunkSize,
            customPrompt,
            metadata,
        });

        return await segmenter.segment(content);
    }

    /**
     * 使用规则进行分块（原有逻辑）
     */
    private splitWithRule(
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

        while (startIndex < content.length) {
            // 1. 确定理想的结束位置
            let idealEndIndex = Math.min(startIndex + this.options.maxChunkSize, content.length);
            let endIndex = idealEndIndex; // 默认使用理想结束位置

            // 2. 如果不是最后一个块，尝试寻找更好的分割点 (稍微向后查找)
            if (endIndex < content.length) {
                let bestSplitPoint = -1;

                // 如果是大模型模式，先确保理想位置是安全的（不在表格或链接内）
                if (this.options.parserMode === 'llm_segmentation') {
                    idealEndIndex = this.findSafeSplitPoint(content, idealEndIndex);
                }

                // 优先段落边界 ('\n\n')，在理想点附近查找
                // 扩大搜索范围，允许更大的分块
                const paragraphSearchStart = Math.max(startIndex, idealEndIndex - 300); // 向前回溯更多开始查找
                const nextParagraph = content.indexOf('\n\n', paragraphSearchStart);
                // 确保找到的段落在合理范围内（允许超过理想点更多）
                if (nextParagraph !== -1 && nextParagraph > startIndex && nextParagraph < idealEndIndex + 500) {
                    bestSplitPoint = nextParagraph + 2; // 包含换行符
                }

                // 如果没找到段落，尝试句子边界（但不包括单个换行符）
                if (bestSplitPoint === -1) {
                    // 移除单个换行符'\n'，避免在表格和列表中过度分割
                    const sentenceEndings = ['\n\n'];
                    const sentenceSearchStart = Math.max(startIndex, idealEndIndex - 300); // 扩大句子回溯范围
                    let bestSentenceEnd = -1;

                    for (const ending of sentenceEndings) {
                        // 从 sentenceSearchStart 开始查找第一个出现的结束符
                        const sentenceEndIndex = content.indexOf(ending, sentenceSearchStart);
                        // 确保找到的位置有效且在合理范围内（允许超过理想点更多）
                        if (sentenceEndIndex !== -1 && sentenceEndIndex > startIndex && sentenceEndIndex < idealEndIndex + 300) {
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
     * 同步版本的 splitDocument（保持向后兼容）
     * @deprecated 请使用异步版本的 splitDocument
     */
    public splitDocumentSync(
        content: string,
        metadata: {
            documentId: string;
            documentName: string;
            [key: string]: any;
        }
    ): DocumentChunk[] {
        // 如果使用智能分块，抛出错误提示使用异步版本
        if (this.options.parserMode === 'jina_segmentation' || this.options.parserMode === 'llm_segmentation') {
            throw new Error(
                `使用 ${this.options.parserMode} 模式需要调用异步版本的 splitDocument 方法`
            );
        }

        return this.splitWithRule(content, metadata);
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