import { DeepSeekProvider } from './providers/deepseek';
import { OpenAIProvider } from './providers/openai';
import { GoogleProvider } from './providers/google';
import {
  getDeepSeekConfigFromEnv,
  getOpenAIConfigFromEnv,
  getGoogleConfigFromEnv,
} from './config';
import {
  Provider,
  ProviderType,
  DeepSeekConfig,
  OpenAIConfig,
  GoogleConfig,
} from './types';
import logger from '@/utils/logger';

/**
 * 提供商工厂
 */
export class ProviderFactory {
  private static providers: Map<ProviderType, Provider> = new Map();

  /**
   * 创建 DeepSeek 提供商
   */
  static createDeepSeek(config?: Partial<DeepSeekConfig>): DeepSeekProvider {
    const fullConfig = config
      ? { ...getDeepSeekConfigFromEnv(), ...config }
      : getDeepSeekConfigFromEnv();
    return new DeepSeekProvider(fullConfig);
  }

  /**
   * 创建 OpenAI 提供商
   */
  static createOpenAI(config?: Partial<OpenAIConfig>): OpenAIProvider {
    const fullConfig = config
      ? { ...getOpenAIConfigFromEnv(), ...config }
      : getOpenAIConfigFromEnv();
    return new OpenAIProvider(fullConfig);
  }

  /**
   * 创建 Google 提供商
   */
  static createGoogle(config?: Partial<GoogleConfig>): GoogleProvider {
    const fullConfig = config
      ? { ...getGoogleConfigFromEnv(), ...config }
      : getGoogleConfigFromEnv();
    return new GoogleProvider(fullConfig);
  }

  /**
   * 获取或创建提供商实例（单例模式）
   */
  static getProvider(type: ProviderType): Provider {
    if (!this.providers.has(type)) {
      logger.info(`[ProviderFactory] Creating new provider: ${type}`);
      
      switch (type) {
        case ProviderType.DeepSeek:
          this.providers.set(type, this.createDeepSeek());
          break;
        case ProviderType.OpenAI:
          this.providers.set(type, this.createOpenAI());
          break;
        case ProviderType.Google:
          this.providers.set(type, this.createGoogle());
          break;
        default:
          throw new Error(`Unsupported provider type: ${type}`);
      }
    }
    
    return this.providers.get(type)!;
  }

  /**
   * 根据模型名称自动选择提供商
   */
  static getProviderByModel(modelName: string): Provider {
    if (modelName.startsWith('deepseek')) {
      return this.getProvider(ProviderType.DeepSeek);
    } else if (modelName.startsWith('gpt-') || modelName.startsWith('o1-')) {
      return this.getProvider(ProviderType.OpenAI);
    } else if (modelName.startsWith('gemini')) {
      return this.getProvider(ProviderType.Google);
    } else {
      throw new Error(`Cannot determine provider for model: ${modelName}`);
    }
  }

  /**
   * 清除所有提供商实例
   */
  static clearProviders(): void {
    this.providers.clear();
  }
}

/**
 * 默认提供商实例
 */
let defaultProvider: Provider | null = null;

/**
 * 获取默认提供商
 */
export function getDefaultProvider(): Provider {
  if (!defaultProvider) {
    // 优先使用 DeepSeek，其次 OpenAI，最后 Google
    if (process.env.DEEPSEEK_API_KEY) {
      defaultProvider = ProviderFactory.getProvider(ProviderType.DeepSeek);
    } else if (process.env.OPENAI_API_KEY) {
      defaultProvider = ProviderFactory.getProvider(ProviderType.OpenAI);
    } else if (process.env.GEMINI_API_KEY) {
      defaultProvider = ProviderFactory.getProvider(ProviderType.Google);
    } else {
      throw new Error('No LLM provider API key found in environment');
    }
  }
  return defaultProvider;
}

/**
 * 设置默认提供商
 */
export function setDefaultProvider(provider: Provider): void {
  defaultProvider = provider;
}

// 导出所有类型和类
export * from './types';
export * from './config';
export * from './history';
export * from './utils';
export * from './embedding';
export { DeepSeekProvider } from './providers/deepseek';
export { OpenAIProvider } from './providers/openai';
export { GoogleProvider } from './providers/google';

