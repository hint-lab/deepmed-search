import { embed, embedMany } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import logger from '@/utils/logger';

/**
 * 创建 OpenAI 嵌入提供商
 */
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  organization: process.env.OPENAI_ORGANIZATION,
});

/**
 * 获取文本的嵌入向量
 * @param text 要嵌入的文本
 * @param model 嵌入模型名称
 * @returns 嵌入向量
 */
export async function getEmbedding(
  text: string,
  model: string = 'text-embedding-3-small'
): Promise<number[]> {
  try {
    // 如果文本为空，返回空向量
    if (!text || text.trim() === '') {
      logger.warn('尝试获取空文本的嵌入向量');
      return Array(1536).fill(0);
    }

    // 使用 AI SDK 的 embed 函数获取嵌入向量
    const { embedding } = await embed({
      model: openai.embedding(model),
      value: text,
    });

    return embedding;
  } catch (error) {
    logger.error('获取嵌入向量失败', {
      error: error instanceof Error ? error.message : '未知错误',
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
    });
    throw error;
  }
}

/**
 * 批量获取文本的嵌入向量
 * @param texts 要嵌入的文本数组
 * @param model 嵌入模型名称
 * @returns 嵌入向量数组
 */
export async function getEmbeddings(
  texts: string[],
  model: string = 'text-embedding-3-small'
): Promise<number[][]> {
  try {
    // 过滤掉空文本
    const validTexts = texts.filter(text => text && text.trim() !== '');

    if (validTexts.length === 0) {
      logger.warn('尝试获取空文本数组的嵌入向量');
      return [Array(1536).fill(0)];
    }

    // 使用 AI SDK 的 embedMany 函数批量获取嵌入向量
    const { embeddings } = await embedMany({
      model: openai.embedding(model),
      values: validTexts,
    });

    return embeddings;
  } catch (error) {
    logger.error('批量获取嵌入向量失败', {
      error: error instanceof Error ? error.message : '未知错误',
      textCount: texts.length,
    });
    throw error;
  }
}
