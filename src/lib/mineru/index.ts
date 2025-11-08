export * from './types';
export * from './config';
export * from './client';

// 导出默认实例创建函数
import { getMinerUConfigFromEnv } from './config';
import { MinerUClient } from './client';

/**
 * 创建默认 MinerU 客户端实例
 */
export function createMinerUClient(): MinerUClient {
  return new MinerUClient(getMinerUConfigFromEnv());
}

