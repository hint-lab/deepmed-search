import logger from '@/utils/logger';
import { DocumentChunk } from './index';
import { createProviderFromUserConfig } from '@/lib/llm-provider';
import { v4 as uuidv4 } from 'uuid';

/**
 * LLM 分块器选项
 */
export interface LLMSegmenterOptions {
    /**
     * 用户ID（必需，用于获取 LLM 配置）
     */
    userId: string;

    /**
     * 每个块的最大字符数（用于提示 LLM）
     */
    maxChunkSize?: number;

    /**
     * 自定义分块 prompt
     */
    customPrompt?: string;

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
 * LLM 分块器
 * 使用用户配置的 LLM 进行智能分块
 */
export class LLMSegmenter {
    private userId: string;
    private maxChunkSize: number;
    private customPrompt?: string;
    private metadata: LLMSegmenterOptions['metadata'];

    constructor(options: LLMSegmenterOptions) {
        this.userId = options.userId;
        this.maxChunkSize = options.maxChunkSize || 2000;
        this.customPrompt = options.customPrompt;
        this.metadata = options.metadata;
    }

    /**
     * 使用 LLM 分块文档
     */
    async segment(content: string): Promise<DocumentChunk[]> {
        if (!content.trim()) {
            return [];
        }

        // 获取用户的 LLM Provider
        let provider;
        try {
            provider = await createProviderFromUserConfig(this.userId);
        } catch (error) {
            throw new Error(
                `未配置 LLM API Key。请访问 /settings/llm 页面配置您的 API Key。错误: ${error instanceof Error ? error.message : '未知错误'
                }`
            );
        }

        logger.info(`[LLMSegmenter] 开始使用 LLM 分块`, {
            documentId: this.metadata.documentId,
            contentLength: content.length,
            provider: provider.type,
            model: provider.model,
        });

        // 生成一个临时的 dialogId 用于此次分块任务
        const dialogId = `llm-segmenter-${uuidv4()}`;

        // 设置系统提示词，指导 LLM 如何分块
        const systemPrompt = `你是一个专业的文档分块助手。你的任务是严格按照 JSON 数组格式返回分块结果，不要添加任何额外的解释文字。

重要要求：
1. 只返回 JSON 数组，不要有任何前缀或后缀文字
2. 每个块必须包含 content、startPosition、endPosition 三个字段
3. startPosition 和 endPosition 必须是数字，表示在原文档中的字符位置
4. 注意markdown中的表格内容不要分开；注意网页和图片链接，也要保持完整不要分开
5. 分块要保证语义完整，优先在段落边界分割`;

        provider.setSystemPrompt(dialogId, systemPrompt);

        // 构建分块 prompt
        const prompt = this.buildChunkingPrompt(content);

        logger.info(`[LLMSegmenter] 发送分块请求`, {
            documentId: this.metadata.documentId,
            promptLength: prompt.length,
            contentLength: content.length,
        });

        try {
            // 调用 LLM 进行分块
            const response = await provider.chat({
                dialogId,
                input: prompt,
            });

            logger.info(`[LLMSegmenter] 收到 LLM 响应`, {
                documentId: this.metadata.documentId,
                responseLength: response.content.length,
                responsePreview: response.content.substring(0, 200),
            });

            // 解析 LLM 返回的分块结果
            const chunks = this.parseLLMResponse(response.content, content);

            logger.info(`[LLMSegmenter] 分块完成`, {
                documentId: this.metadata.documentId,
                totalChunks: chunks.length,
            });

            return chunks;
        } catch (error) {
            logger.error(`[LLMSegmenter] LLM 分块失败`, {
                documentId: this.metadata.documentId,
                error: error instanceof Error ? error.message : '未知错误',
            });
            throw new Error(
                `LLM 分块失败: ${error instanceof Error ? error.message : '未知错误'}`
            );
        }
    }

    /**
     * 构建分块 prompt
     */
    private buildChunkingPrompt(content: string): string {
        // 如果内容太长，需要分批处理
        const MAX_CONTENT_LENGTH = 50000; // 限制单次处理的内容长度
        const actualContent = content.length > MAX_CONTENT_LENGTH
            ? content.substring(0, MAX_CONTENT_LENGTH) + '\n\n[内容已截断，仅处理前50000字符]'
            : content;

        const basePrompt = this.customPrompt || this.getDefaultPrompt();

        return `${basePrompt}

文档内容（共 ${actualContent.length} 字符）：
${actualContent}

请将上述文档内容分割成多个块，每个块的最大长度约为 ${this.maxChunkSize} 字符。

**重要：只返回 JSON 数组，不要有任何其他文字！**

返回格式（必须是有效的 JSON 数组）：
[
  {
    "content": "第一块的内容...",
    "startPosition": 0,
    "endPosition": 500
  },
  {
    "content": "第二块的内容...",
    "startPosition": 500,
    "endPosition": 1000
  }
]

要求：
1. 分块在语义上完整，优先在段落边界（\\n\\n）分割
2. 每个块的长度尽量接近但不超过 ${this.maxChunkSize} 字符
3. startPosition 和 endPosition 必须准确对应原文档中的字符位置
4. 只返回 JSON 数组，不要有任何解释文字`;
    }

    /**
     * 获取默认的分块 prompt
     */
    private getDefaultPrompt(): string {
        return `你是一个专业的文档分块助手。你的任务是将文档内容分割成多个语义完整的块，每个块适合用于向量检索。

分块原则：
1. 保持语义完整性：不要在句子中间或段落中间切断
2. 优先在段落边界分割
3. 如果段落太长，可以在句子边界分割
4. 保持上下文连贯性：每个块应该包含足够的上下文信息
5. 避免过度分割：如果内容本身就很短，可以作为一个块`;
    }

    /**
     * 解析 LLM 返回的分块结果
     */
    private parseLLMResponse(llmResponse: string, originalContent: string): DocumentChunk[] {
        try {
            // 尝试提取 JSON 部分（可能包含在代码块中）
            let jsonStr = llmResponse.trim();

            logger.debug(`[LLMSegmenter] 开始解析响应`, {
                documentId: this.metadata.documentId,
                responseLength: jsonStr.length,
                startsWithBracket: jsonStr.startsWith('['),
                startsWithCodeBlock: jsonStr.startsWith('```'),
            });

            // 移除可能的 markdown 代码块标记
            if (jsonStr.startsWith('```')) {
                const lines = jsonStr.split('\n');
                const startIndex = lines[0].includes('json') ? 1 : 1;
                // 查找结束的 ```
                let endIndex = lines.length;
                for (let i = lines.length - 1; i >= 0; i--) {
                    if (lines[i].trim() === '```') {
                        endIndex = i;
                        break;
                    }
                }
                jsonStr = lines.slice(startIndex, endIndex).join('\n').trim();
            }

            // 尝试提取 JSON 数组（可能前后有其他文字）
            // 查找第一个 [ 和最后一个 ]
            const firstBracket = jsonStr.indexOf('[');
            const lastBracket = jsonStr.lastIndexOf(']');
            if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
                jsonStr = jsonStr.substring(firstBracket, lastBracket + 1);
            }

            logger.debug(`[LLMSegmenter] 提取的 JSON 字符串`, {
                documentId: this.metadata.documentId,
                jsonLength: jsonStr.length,
                jsonPreview: jsonStr.substring(0, 300),
            });

            // 尝试解析 JSON
            const chunks = JSON.parse(jsonStr);

            if (!Array.isArray(chunks)) {
                throw new Error('LLM 返回的不是数组格式');
            }

            // 转换为 DocumentChunk 格式
            const documentChunks: DocumentChunk[] = chunks.map((chunk: any, index: number) => {
                const content = chunk.content || '';
                const startPosition = chunk.startPosition ?? 0;
                const endPosition = chunk.endPosition ?? content.length;

                return {
                    id: `${this.metadata.documentId}-chunk-${index}`,
                    content: content.trim(),
                    metadata: {
                        ...this.metadata,
                        position: index,
                        startPosition: startPosition,
                        endPosition: endPosition,
                    },
                };
            });

            // 验证分块的有效性
            const validChunks = documentChunks.filter((chunk) => chunk.content.length > 0);

            logger.info(`[LLMSegmenter] 成功解析 ${validChunks.length} 个块`, {
                documentId: this.metadata.documentId,
                totalParsed: documentChunks.length,
                validChunks: validChunks.length,
            });

            if (validChunks.length === 0) {
                throw new Error('解析后没有有效的块');
            }

            return validChunks;
        } catch (error) {
            logger.error(`[LLMSegmenter] 解析 LLM 响应失败`, {
                documentId: this.metadata.documentId,
                error: error instanceof Error ? error.message : '未知错误',
                errorStack: error instanceof Error ? error.stack : undefined,
                responseLength: llmResponse.length,
                responsePreview: llmResponse.substring(0, 1000), // 记录前1000字符用于调试
            });

            // 如果解析失败，回退到简单的规则分块
            logger.warn(`[LLMSegmenter] 回退到规则分块`, {
                documentId: this.metadata.documentId,
                reason: error instanceof Error ? error.message : '未知错误',
            });

            return this.fallbackToRuleBasedChunking(originalContent);
        }
    }

    /**
     * 回退到基于规则的分块（当 LLM 返回格式不正确时）
     */
    private fallbackToRuleBasedChunking(content: string): DocumentChunk[] {
        const chunks: DocumentChunk[] = [];
        let chunkIndex = 0;
        let startIndex = 0;

        while (startIndex < content.length) {
            const idealEndIndex = Math.min(startIndex + this.maxChunkSize, content.length);
            let endIndex = idealEndIndex;

            // 如果不是最后一个块，尝试在段落边界分割
            if (endIndex < content.length) {
                const paragraphSearchStart = Math.max(startIndex, idealEndIndex - 300);
                const nextParagraph = content.indexOf('\n\n', paragraphSearchStart);
                if (nextParagraph !== -1 && nextParagraph > startIndex && nextParagraph < idealEndIndex + 500) {
                    endIndex = nextParagraph + 2;
                }
            } else {
                endIndex = content.length;
            }

            const chunkContent = content.substring(startIndex, endIndex).trim();
            if (chunkContent) {
                chunks.push({
                    id: `${this.metadata.documentId}-chunk-${chunkIndex}`,
                    content: chunkContent,
                    metadata: {
                        ...this.metadata,
                        position: chunkIndex,
                        startPosition: startIndex,
                        endPosition: endIndex,
                    },
                });
                chunkIndex++;
            }

            startIndex = endIndex;
        }

        return chunks;
    }
}

