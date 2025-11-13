import { embed, embedMany } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import logger from '@/utils/logger';
import { prisma } from '@/lib/prisma';
import { decryptApiKey } from '@/lib/crypto';

/**
 * 嵌入配置接口
 */
interface EmbeddingConfig {
  provider: 'openai' | 'volcengine';
  apiKey: string;
  baseURL?: string;
  model: string;
  dimension: number;
}

/**
 * 创建自定义fetch函数，增加超时时间和重试机制
 * 使用更激进的超时和重试策略来解决网络连接问题
 */
const createFetchWithTimeout = (timeout: number = 120000) => {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // 如果已有signal，监听它并取消超时
    if (init?.signal) {
      init.signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        controller.abort();
      });
    }

    try {
      // 强制使用 HTTP/1.1 以避免连接问题
      const headers = new Headers(init?.headers);
      if (!headers.has('Connection')) {
        headers.set('Connection', 'close'); // 避免 keep-alive 问题
      }

      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
        headers,
        // 不使用 keepalive，避免连接问题
        keepalive: false,
        // 添加 priority 提示
        priority: 'high',
      } as RequestInit);

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        if (!init?.signal?.aborted) {
          throw new Error(`Request timeout after ${timeout / 1000} seconds. 请检查网络连接或配置代理/自定义API端点`);
        }
      }
      // 添加更详细的错误信息
      if (error instanceof Error) {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : 'unknown';
        logger.error('Fetch error details:', {
          message: error.message,
          name: error.name,
          url,
          suggestion: url.includes('api.openai.com') ?
            '如果无法访问 OpenAI API，请在 /settings/embedding 配置自定义 Base URL（如使用代理或中转服务）' :
            '请检查网络连接和 API 配置'
        });
      }
      throw error;
    }
  };
};

/**
 * 创建默认 OpenAI 嵌入提供商（环境变量）
 */
const defaultOpenAI = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  organization: process.env.OPENAI_ORGANIZATION,
  fetch: createFetchWithTimeout(120000), // 120秒超时，更宽松的超时策略
});

/**
 * 获取用户的嵌入配置
 */
async function getUserEmbeddingConfig(userId?: string): Promise<EmbeddingConfig> {
  try {
    if (!userId) {
      // 使用环境变量默认配置
      return {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY || '',
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        model: 'text-embedding-3-small',
        dimension: 1536
      };
    }

    const config = await prisma.searchConfig.findUnique({
      where: { userId },
      select: {
        embeddingProvider: true,
        embeddingApiKey: true,
        embeddingModel: true,
        embeddingBaseUrl: true,
        embeddingDimension: true
      }
    });

    if (!config || !config.embeddingApiKey) {
      // 使用环境变量默认配置
      return {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY || '',
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        model: 'text-embedding-3-small',
        dimension: 1536
      };
    }

    return {
      provider: config.embeddingProvider as 'openai' | 'volcengine',
      apiKey: decryptApiKey(config.embeddingApiKey),
      baseURL: config.embeddingBaseUrl || undefined,
      model: config.embeddingModel,
      dimension: config.embeddingDimension
    };
  } catch (error) {
    logger.error('获取用户嵌入配置失败', { userId, error });
    // 返回默认配置
    return {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY || '',
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      model: 'text-embedding-3-small',
      dimension: 1536
    };
  }
}

/**
 * 创建嵌入提供商实例
 */
function createEmbeddingProvider(config: EmbeddingConfig) {
  const commonOptions = {
    apiKey: config.apiKey,
    fetch: createFetchWithTimeout(120000), // 120秒超时，更宽松的超时策略
  };

  if (config.provider === 'volcengine') {
    // 火山引擎使用 OpenAI 兼容接口
    return createOpenAI({
      ...commonOptions,
      baseURL: config.baseURL || 'https://ark.cn-beijing.volces.com/api/v3',
    });
  } else {
    // OpenAI 或其他兼容服务
    const baseURL = config.baseURL || 'https://api.openai.com/v1';
    logger.info('创建 embedding 提供商', {
      provider: config.provider,
      baseURL,
      model: config.model,
      useCustomEndpoint: !!config.baseURL
    });
    return createOpenAI({
      ...commonOptions,
      baseURL,
    });
  }
}

/**
 * 获取文本的嵌入向量
 * @param text 要嵌入的文本
 * @param model 嵌入模型名称（可选，会使用用户配置）
 * @param userId 用户ID（可选，用于获取用户配置）
 * @returns 嵌入向量
 */
export async function getEmbedding(
  text: string,
  model?: string,
  userId?: string
): Promise<number[]> {
  try {
    // 如果文本为空，返回空向量
    if (!text || text.trim() === '') {
      logger.warn('尝试获取空文本的嵌入向量');
      const config = await getUserEmbeddingConfig(userId);
      return Array(config.dimension).fill(0);
    }

    // 获取用户配置
    const config = await getUserEmbeddingConfig(userId);
    const finalModel = model || config.model;

    logger.info('正在获取嵌入向量', {
      provider: config.provider,
      model: finalModel,
      baseURL: config.baseURL || '(default)',
      textLength: text.length,
      userId: userId || '(system)'
    });

    // 创建提供商实例
    const provider = createEmbeddingProvider(config);

    // 使用 AI SDK 的 embed 函数获取嵌入向量，添加更激进的重试配置
    const { embedding } = await embed({
      model: provider.embedding(finalModel),
      value: text,
      maxRetries: 5, // 增加到5次重试
      // 添加重试延迟配置
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'getEmbedding',
        metadata: {
          userId: userId || 'system',
          textLength: text.length,
          baseURL: config.baseURL || 'default'
        }
      },
      // 自定义重试逻辑：对于连接超时错误，使用指数退避
      abortSignal: undefined, // 不使用 abort signal 以避免额外的超时
    });

    logger.info('成功获取嵌入向量', {
      dimension: embedding.length,
      userId: userId || '(system)'
    });

    return embedding;
  } catch (error) {
    const config = await getUserEmbeddingConfig(userId);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    const isConnectionError = errorMessage.includes('Connect Timeout') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('Network') ||
      errorMessage.includes('ConnectTimeoutError');

    const isUsingDefaultAPI = !config.baseURL || config.baseURL === 'https://api.openai.com/v1';

    logger.error('获取嵌入向量失败', {
      error: errorMessage,
      errorType: isConnectionError ? 'CONNECTION_ERROR' : 'API_ERROR',
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      userId: userId || '(system)',
      baseURL: config.baseURL || 'default',
      model: model || config.model,
      suggestion: isConnectionError ? (
        isUsingDefaultAPI ?
          '❌ 无法连接到 OpenAI API。建议：\n' +
          '1. 在 /settings/embedding 配置自定义 Base URL（使用代理或中转服务）\n' +
          '2. 检查网络连接和防火墙设置\n' +
          '3. 确认 API Key 是否正确\n' +
          '4. 如在中国大陆，建议使用国内中转服务' :
          '无法连接到自定义 API 端点。请检查：\n' +
          '1. Base URL 配置是否正确\n' +
          '2. 代理服务是否正常运行\n' +
          '3. 网络连接是否正常'
      ) : '请检查 API Key 和模型配置'
    });
    throw error;
  }
}

/**
 * 批量获取文本的嵌入向量
 * @param texts 要嵌入的文本数组
 * @param model 嵌入模型名称（可选，会使用用户配置）
 * @param userId 用户ID（可选，用于获取用户配置）
 * @returns 嵌入向量数组
 */
export async function getEmbeddings(
  texts: string[],
  model?: string,
  userId?: string
): Promise<number[][]> {
  try {
    // 获取用户配置
    const config = await getUserEmbeddingConfig(userId);

    // 过滤掉空文本
    const validTexts = texts.filter(text => text && text.trim() !== '');

    if (validTexts.length === 0) {
      logger.warn('尝试获取空文本数组的嵌入向量');
      return [Array(config.dimension).fill(0)];
    }

    const finalModel = model || config.model;

    logger.info('正在批量获取嵌入向量', {
      provider: config.provider,
      model: finalModel,
      baseURL: config.baseURL || '(default)',
      textCount: validTexts.length,
      userId: userId || '(system)'
    });

    // 创建提供商实例
    const provider = createEmbeddingProvider(config);

    // 使用 AI SDK 的 embedMany 函数批量获取嵌入向量，添加更激进的重试配置
    const { embeddings } = await embedMany({
      model: provider.embedding(finalModel),
      values: validTexts,
      maxRetries: 5, // 增加到5次重试
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'getEmbeddings',
        metadata: {
          userId: userId || 'system',
          textCount: validTexts.length,
          baseURL: config.baseURL || 'default'
        }
      },
      abortSignal: undefined, // 不使用 abort signal 以避免额外的超时
    });

    logger.info('成功批量获取嵌入向量', {
      count: embeddings.length,
      dimension: embeddings[0]?.length || 0,
      userId: userId || '(system)'
    });

    return embeddings;
  } catch (error) {
    const errorConfig = await getUserEmbeddingConfig(userId);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    const isConnectionError = errorMessage.includes('Connect Timeout') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('Network') ||
      errorMessage.includes('ConnectTimeoutError');

    const isUsingDefaultAPI = !errorConfig.baseURL || errorConfig.baseURL === 'https://api.openai.com/v1';

    logger.error('批量获取嵌入向量失败', {
      error: errorMessage,
      errorType: isConnectionError ? 'CONNECTION_ERROR' : 'API_ERROR',
      textCount: texts.length,
      userId: userId || '(system)',
      baseURL: errorConfig.baseURL || 'default',
      model: model || errorConfig.model,
      suggestion: isConnectionError ? (
        isUsingDefaultAPI ?
          '❌ 无法连接到 OpenAI API。建议：\n' +
          '1. 在 /settings/embedding 配置自定义 Base URL（使用代理或中转服务）\n' +
          '2. 检查网络连接和防火墙设置\n' +
          '3. 确认 API Key 是否正确\n' +
          '4. 如在中国大陆，建议使用国内中转服务' :
          '无法连接到自定义 API 端点。请检查：\n' +
          '1. Base URL 配置是否正确\n' +
          '2. 代理服务是否正常运行\n' +
          '3. 网络连接是否正常'
      ) : '请检查 API Key 和模型配置'
    });
    throw error;
  }
}
