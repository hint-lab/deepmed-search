import { MinerUConfig } from './types';

/**
 * MinerU 默认配置
 */
export const DEFAULT_MINERU_CONFIG: Partial<MinerUConfig> = {
  baseUrl: process.env.MINERU_BASE_URL || 'https://mineru.net/api',
  timeout: 300000, // 5 分钟超时
};

/**
 * 从环境变量获取 MinerU 配置
 */
export function getMinerUConfigFromEnv(): MinerUConfig {
  const apiKey = process.env.MINERU_API_KEY;
  if (!apiKey) {
    throw new Error('MINERU_API_KEY is required');
  }

  return {
    apiKey,
    baseUrl: process.env.MINERU_BASE_URL || DEFAULT_MINERU_CONFIG.baseUrl,
    timeout: parseInt(process.env.MINERU_TIMEOUT || '300000', 10),
  };
}

/**
 * 验证配置
 */
export function validateMinerUConfig(config: Partial<MinerUConfig>): MinerUConfig {
  if (!config.apiKey) {
    throw new Error('MinerU API key is required');
  }

  return {
    ...DEFAULT_MINERU_CONFIG,
    ...config,
  } as MinerUConfig;
}

