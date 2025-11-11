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
  // 如果提供了用户 ID，尝试获取用户配置
  if (userId) {
    try {
      const userConfig = await prisma.searchConfig.findUnique({
        where: { userId },
      });

      if (userConfig) {
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

        // 如果用户配置了任何 API Key，返回用户配置
        if (config.tavilyApiKey || config.jinaApiKey || config.ncbiApiKey) {
          return config;
        }
      }
    } catch (error) {
      console.error('获取用户搜索配置失败:', error);
      // 继续使用系统默认配置
    }
  }

  // 返回系统默认配置（从环境变量）
  return {
    tavilyApiKey: process.env.TAVILY_API_KEY,
    jinaApiKey: process.env.JINA_API_KEY,
    ncbiApiKey: process.env.NCBI_API_KEY,
    searchProvider: (process.env.SEARCH_PROVIDER as 'tavily' | 'jina') || 'jina',
  };
}

/**
 * 获取特定搜索服务的 API Key
 * @param service 搜索服务名称
 * @param userId 用户ID（可选）
 */
export async function getSearchApiKey(
  service: 'tavily' | 'jina' | 'ncbi',
  userId?: string
): Promise<string | undefined> {
  const config = await getSearchConfig(userId);
  
  switch (service) {
    case 'tavily':
      return config.tavilyApiKey;
    case 'jina':
      return config.jinaApiKey;
    case 'ncbi':
      return config.ncbiApiKey;
    default:
      return undefined;
  }
}

/**
 * 获取默认搜索提供商
 * @param userId 用户ID（可选）
 */
export async function getSearchProvider(userId?: string): Promise<'tavily' | 'jina'> {
  const config = await getSearchConfig(userId);
  return config.searchProvider;
}

