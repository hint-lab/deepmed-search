import {
  DeepSeekConfig,
  OpenAIConfig,
  GoogleConfig,
  BaseProviderConfig,
} from './types';

/**
 * DeepSeek 默认配置
 */
export const DEFAULT_DEEPSEEK_CONFIG: Partial<DeepSeekConfig> = {
  baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  model: process.env.DEEPSEEK_API_MODEL || 'deepseek-chat',
  reasonModel: process.env.DEEPSEEK_API_REASON_MODEL || 'deepseek-reasoner',
  temperature: 0.7,
  maxTokens: 2000,
  systemPrompt: '你是DeepMed团队开发的一个专业的医学AI助手',
};

/**
 * OpenAI 默认配置
 */
export const DEFAULT_OPENAI_CONFIG: Partial<OpenAIConfig> = {
  baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  model: process.env.OPENAI_API_MODEL || 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 2000,
  systemPrompt: '你是DeepMed团队开发的一个专业的医学AI助手',
};

/**
 * Google (Gemini) 默认配置
 */
export const DEFAULT_GOOGLE_CONFIG: Partial<GoogleConfig> = {
  baseUrl: process.env.GEMINI_BASE_URL,
  model: process.env.GEMINI_API_MODEL || 'gemini-2.0-flash-exp',
  temperature: 0.7,
  maxTokens: 2000,
  systemPrompt: '你是DeepMed团队开发的一个专业的医学AI助手',
};

/**
 * 验证配置
 */
export function validateConfig<T extends BaseProviderConfig>(
  config: Partial<T>,
  defaults: Partial<T>
): T {
  // if (!config.apiKey) {
  //   throw new Error('API Key is required');
  // }

  return {
    ...defaults,
    ...config,
  } as T;
}

/**
 * 从环境变量获取 DeepSeek 配置
 */
export function getDeepSeekConfigFromEnv(): DeepSeekConfig {
  return validateConfig<DeepSeekConfig>(
    {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseUrl: process.env.DEEPSEEK_BASE_URL,
      model: process.env.DEEPSEEK_API_MODEL,
      reasonModel: process.env.DEEPSEEK_API_REASON_MODEL,
      organization: process.env.DEEPSEEK_ORGANIZATION,
    },
    DEFAULT_DEEPSEEK_CONFIG
  );
}

/**
 * 从环境变量获取 OpenAI 配置
 */
export function getOpenAIConfigFromEnv(): OpenAIConfig {
  return validateConfig<OpenAIConfig>(
    {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseUrl: process.env.OPENAI_BASE_URL,
      model: process.env.OPENAI_API_MODEL,
      organization: process.env.OPENAI_ORGANIZATION,
    },
    DEFAULT_OPENAI_CONFIG
  );
}

/**
 * 从环境变量获取 Google 配置
 */
export function getGoogleConfigFromEnv(): GoogleConfig {
  return validateConfig<GoogleConfig>(
    {
      apiKey: process.env.GEMINI_API_KEY || '',
      baseUrl: process.env.GEMINI_BASE_URL,
      model: process.env.GEMINI_API_MODEL,
    },
    DEFAULT_GOOGLE_CONFIG
  );
}

