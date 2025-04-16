import OpenAI from 'openai';
import { DEFAULT_CONFIG } from './config';
import logger from '@/utils/logger';

// 创建OpenAI客户端
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
    baseURL: DEFAULT_CONFIG.baseUrl,
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

        // 调用OpenAI API获取嵌入向量
        const response = await openai.embeddings.create({
            model,
            input: text,
            encoding_format: 'float',
        });

        return response.data[0].embedding;
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

        // 调用OpenAI API获取嵌入向量
        const response = await openai.embeddings.create({
            model,
            input: validTexts,
            encoding_format: 'float',
        });

        return response.data.map(item => item.embedding);
    } catch (error) {
        logger.error('批量获取嵌入向量失败', {
            error: error instanceof Error ? error.message : '未知错误',
            textCount: texts.length,
        });
        throw error;
    }
} 