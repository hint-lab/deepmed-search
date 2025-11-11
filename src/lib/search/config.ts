/**
 * 搜索配置辅助函数
 * 用于在搜索功能中获取用户配置或系统默认配置
 */

import { prisma } from '@/lib/prisma';
import { decryptApiKey } from '@/lib/crypto';

export interface SearchAPIKeys {
  tavilyApiKey?: string;
  jinaApiKey?: string;
  ncbiApiKey?: string;
  searchProvider: 'tavily' | 'jina';
}

/**
 * 获取用户的搜索配置
 * 优先使用用户配置，如果没有则使用系统环境变量
 */
export async function getSearchConfig(userId?: string): Promise<SearchAPIKeys> {
  // 必须提供用户 ID
  if (!userId) {
    throw new Error('需要用户 ID 才能获取搜索配置。请登录后重试。');
  }

  try {
    const userConfig = await prisma.searchConfig.findUnique({
      where: { userId },
    });

    if (!userConfig) {
      throw new Error(
        '未配置搜索 API Key。请访问 /settings/search 页面配置您的搜索 API Key'
      );
    }

    const config: SearchAPIKeys = {
      searchProvider: userConfig.searchProvider as 'tavily' | 'jina',
    };

    // 解密 API Keys（如果存在）
    if (userConfig.tavilyApiKey) {
      config.tavilyApiKey = decryptApiKey(userConfig.tavilyApiKey);
    }
    if (userConfig.jinaApiKey) {
      config.jinaApiKey = decryptApiKey(userConfig.jinaApiKey);
    }
    if (userConfig.ncbiApiKey) {
      config.ncbiApiKey = decryptApiKey(userConfig.ncbiApiKey);
    }

    // 检查用户是否配置了任何 API Key
    if (!config.tavilyApiKey && !config.jinaApiKey && !config.ncbiApiKey) {
      throw new Error(
        '未配置搜索 API Key。请访问 /settings/search 页面配置至少一个搜索服务的 API Key'
      );
    }

    // 检查当前选择的搜索提供商是否配置了对应的 API Key
    if (config.searchProvider === 'tavily' && !config.tavilyApiKey) {
      throw new Error(
        '未配置 Tavily API Key。请访问 /settings/search 页面配置 Tavily API Key，或切换到 Jina 搜索'
      );
    }
    if (config.searchProvider === 'jina' && !config.jinaApiKey) {
      throw new Error(
        '未配置 Jina API Key。请访问 /settings/search 页面配置 Jina API Key，或切换到 Tavily 搜索'
      );
    }

    return config;
  } catch (error) {
    if (error instanceof Error) {
      throw error; // 重新抛出已知错误
    }
    throw new Error('获取搜索配置失败，请重试');
  }
}

/**
 * 获取特定搜索服务的 API Key
 * @param service 搜索服务名称
 * @param userId 用户ID（必需）
 */
export async function getSearchApiKey(
  service: 'tavily' | 'jina' | 'ncbi',
  userId: string
): Promise<string> {
  const config = await getSearchConfig(userId);

  let apiKey: string | undefined;
  switch (service) {
    case 'tavily':
      apiKey = config.tavilyApiKey;
      break;
    case 'jina':
      apiKey = config.jinaApiKey;
      break;
    case 'ncbi':
      apiKey = config.ncbiApiKey;
      break;
  }

  if (!apiKey) {
    throw new Error(
      `未配置 ${service.toUpperCase()} API Key。请访问 /settings/search 页面配置`
    );
  }

  return apiKey;
}

/**
 * 获取默认搜索提供商
 * @param userId 用户ID（可选）
 */
export async function getSearchProvider(userId?: string): Promise<'tavily' | 'jina'> {
  const config = await getSearchConfig(userId);
  return config.searchProvider;
}

