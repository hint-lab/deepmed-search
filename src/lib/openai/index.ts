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
    stop: [],
} as const; 