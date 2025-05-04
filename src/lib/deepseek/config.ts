import { DeepSeekConfig } from './types'

// 默认配置
export const DEFAULT_CONFIG: Partial<DeepSeekConfig> = {
    model: process.env.DEEPSEEK_API_MODEL || 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 2000,
    stop: [],
    systemPrompt: '你是一个有帮助的AI助手。',
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
}

// 验证配置
export function validateConfig(config: Partial<DeepSeekConfig>): DeepSeekConfig {
    if (!config.baseUrl) {
        throw new Error('DeepSeek baseUrl is required')
    }
    if (!config.apiKey) {
        throw new Error('DeepSeek apiKey is required')
    }

    return {
        ...DEFAULT_CONFIG,
        ...config,
    } as DeepSeekConfig
} 