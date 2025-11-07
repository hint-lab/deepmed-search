import { createOpenAI } from '@ai-sdk/openai';

// 创建 OpenAI provider 实例
export const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    organization: process.env.OPENAI_ORGANIZATION,
});

export * from './types';
export * from './config';
export * from './chat/client';
export * from './chat/history';
export * from './embedding';

// 导出默认配置
export const DEFAULT_CONFIG = {
    model: process.env.OPENAI_API_MODEL || 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2000,
} as const; 