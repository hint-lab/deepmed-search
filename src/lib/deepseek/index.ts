import OpenAI from 'openai';

// 创建 OpenAI 客户端实例
export const openai = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    organization: process.env.DEEPSEEK_ORGANIZATION,
});

export * from './types';
export * from './config';
export * from './chat/client';
export * from './chat/history';

// 导出默认配置
export const DEFAULT_CONFIG = {
    model: process.env.DEEPSEEK_API_MODEL || 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 2000,
    stop: [],
} as const; 