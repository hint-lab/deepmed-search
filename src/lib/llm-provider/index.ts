import { DeepSeekProvider } from './providers/deepseek';
import { OpenAIProvider } from './providers/openai';
import { GoogleProvider } from './providers/google';
import {
  DEFAULT_DEEPSEEK_CONFIG,
  DEFAULT_OPENAI_CONFIG,
  DEFAULT_GOOGLE_CONFIG,
} from './config';
import {
  Provider,
  ProviderType,
  DeepSeekConfig,
  OpenAIConfig,
  GoogleConfig,
} from './types';
import logger from '@/utils/logger';
import { prisma } from '@/lib/prisma';
import { decryptApiKey } from '@/lib/crypto';

/**
 * 提供商工厂
 */
export class ProviderFactory {
  private static providers: Map<ProviderType, Provider> = new Map();

  /**
   * 创建 DeepSeek 提供商
   * 注意：必须提供 apiKey，不再从环境变量读取
   */
  static createDeepSeek(config: Partial<DeepSeekConfig>): DeepSeekProvider {
    if (!config?.apiKey) {
      throw new Error('API Key is required. All API keys must be provided by user configuration.');
    }
    const fullConfig = {
      ...DEFAULT_DEEPSEEK_CONFIG,
      ...config,
    } as DeepSeekConfig;
    return new DeepSeekProvider(fullConfig);
  }

  /**
   * 创建 OpenAI 提供商
   * 注意：必须提供 apiKey，不再从环境变量读取
   */
  static createOpenAI(config: Partial<OpenAIConfig>): OpenAIProvider {
    if (!config?.apiKey) {
      throw new Error('API Key is required. All API keys must be provided by user configuration.');
    }
    const fullConfig = {
      ...DEFAULT_OPENAI_CONFIG,
      ...config,
    } as OpenAIConfig;
    return new OpenAIProvider(fullConfig);
  }

  /**
   * 创建 Google 提供商
   * 注意：必须提供 apiKey，不再从环境变量读取
   */
  static createGoogle(config: Partial<GoogleConfig>): GoogleProvider {
    if (!config?.apiKey) {
      throw new Error('API Key is required. All API keys must be provided by user configuration.');
    }
    const fullConfig = {
      ...DEFAULT_GOOGLE_CONFIG,
      ...config,
    } as GoogleConfig;
    return new GoogleProvider(fullConfig);
  }

  /**
   * 获取或创建提供商实例（单例模式）
   * @deprecated 此方法已废弃，请使用 createProviderFromUserConfig(userId) 代替
   * 所有 API Key 必须由用户配置提供，不再支持从环境变量读取
   */
  static getProvider(type: ProviderType): Provider {
    throw new Error(
      'getProvider() 已废弃。请使用 createProviderFromUserConfig(userId) 代替。所有 API Key 必须由用户在 /settings/llm 页面配置。'
    );
  }

  /**
   * 根据模型名称自动选择提供商
   * @deprecated 此方法已废弃，请使用 createProviderFromUserConfig(userId) 代替
   * 所有 API Key 必须由用户配置提供，不再支持从环境变量读取
   */
  static getProviderByModel(modelName: string): Provider {
    throw new Error(
      'getProviderByModel() 已废弃。请使用 createProviderFromUserConfig(userId) 代替。所有 API Key 必须由用户在 /settings/llm 页面配置。'
    );
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
 * 注意：不再使用系统环境变量，要求用户必须配置
 */
export function getDefaultProvider(): Provider {
  // 不再提供系统级默认 provider
  // 所有用户必须在 /settings/llm 页面配置自己的 API keys
  throw new Error(
    '未配置 LLM API Key。请访问 /settings/llm 页面配置您的 API Key'
  );
}

/**
 * 设置默认提供商
 */
export function setDefaultProvider(provider: Provider): void {
  defaultProvider = provider;
}

/**
 * 从用户配置创建 Provider
 * 使用用户激活的配置，如果没有则使用系统默认配置
 */
export async function createProviderFromUserConfig(userId: string): Promise<Provider> {
  try {
    // 获取用户激活的配置
    const activeConfig = await prisma.lLMConfig.findFirst({
      where: {
        userId: userId,
        isActive: true,
      },
    });

    // 如果用户有激活的配置，使用它
    if (activeConfig) {
      const decryptedApiKey = decryptApiKey(activeConfig.apiKey);

      logger.info(`[ProviderFactory] Using user-configured provider: ${activeConfig.provider} (${activeConfig.name}) for user: ${userId}`);

      switch (activeConfig.provider) {
        case 'deepseek':
          return ProviderFactory.createDeepSeek({
            apiKey: decryptedApiKey,
            baseUrl: activeConfig.baseUrl || undefined,
            model: activeConfig.model || undefined,
            reasonModel: activeConfig.reasonModel || undefined,
          });
        case 'openai':
          return ProviderFactory.createOpenAI({
            apiKey: decryptedApiKey,
            baseUrl: activeConfig.baseUrl || undefined,
            model: activeConfig.model || undefined,
          });
        case 'google':
          return ProviderFactory.createGoogle({
            apiKey: decryptedApiKey,
            baseUrl: activeConfig.baseUrl || undefined,
            model: activeConfig.model || undefined,
          });
        default:
          logger.warn(`[ProviderFactory] Unknown provider: ${activeConfig.provider}, falling back to default`);
          return getDefaultProvider();
      }
    }

    // 如果用户没有配置，使用系统默认配置
    logger.info(`[ProviderFactory] User ${userId} has no active LLM config, using default provider`);
    return getDefaultProvider();
  } catch (error) {
    logger.error(`[ProviderFactory] Error creating provider for user ${userId}:`, error);
    // 如果发生错误，返回系统默认配置
    return getDefaultProvider();
  }
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

