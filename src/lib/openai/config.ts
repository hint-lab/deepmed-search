import { OpenAIConfig } from './types'

// 默认配置
export const DEFAULT_CONFIG: Partial<OpenAIConfig> = {
    model: process.env.OPENAI_API_MODEL || 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2000,
    systemPrompt: '你是DeepMed团队开发的一个专业的医学AI助手',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
}

// 验证配置
export function validateConfig(config: Partial<OpenAIConfig>): OpenAIConfig {
    if (!config.baseUrl) {
        throw new Error('OpenAI baseUrl is required')
    }
    if (!config.apiKey) {
        throw new Error('OpenAI apiKey is required')
    }

    return {
        ...DEFAULT_CONFIG,
        ...config,
    } as OpenAIConfig
} 