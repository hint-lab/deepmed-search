import { DeepSeekProvider } from './providers/deepseek';
import { OpenAIProvider } from './providers/openai';
import { GoogleProvider } from './providers/google';
import {
  getDeepSeekConfigFromEnv,
  getOpenAIConfigFromEnv,
  getGoogleConfigFromEnv,
  getDeepSeekConfig,
  getOpenAIConfig,
  getGoogleConfig,
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
   * @deprecated 使用 getProviderForUser 替代，以支持用户特定配置
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
   * 根据userId获取或创建提供商实例
   * 优先使用用户数据库配置，如果字段为空则使用环境变量
   * @param type 提供商类型
   * @param userId 用户ID（可选）
   * @returns 提供商实例
   */
  static async getProviderForUser(type: ProviderType, userId?: string | null): Promise<Provider> {
    // 如果没有userId，使用默认的单例模式
    if (!userId) {
      return this.getProvider(type);
    }

    // 为每个用户创建独立的provider实例（使用userId作为key）
    const providerKey = `${type}:${userId}`;
    
    // 检查是否已有该用户的provider实例
    // 注意：由于配置可能变化，我们每次都重新创建以确保使用最新配置
    // 如果需要缓存，可以在这里添加缓存逻辑
    
    logger.info(`[ProviderFactory] Creating provider for user: ${type} (userId: ${userId})`);
    
    let config: DeepSeekConfig | OpenAIConfig | GoogleConfig;
    
    switch (type) {
      case ProviderType.DeepSeek:
        config = await getDeepSeekConfig(userId);
        return new DeepSeekProvider(config);
      case ProviderType.OpenAI:
        config = await getOpenAIConfig(userId);
        return new OpenAIProvider(config);
      case ProviderType.Google:
        config = await getGoogleConfig(userId);
        return new GoogleProvider(config);
      default:
        throw new Error(`Unsupported provider type: ${type}`);
    }
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

