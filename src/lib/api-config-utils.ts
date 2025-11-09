import { prisma } from '@/lib/prisma';

/**
 * 用户API配置接口
 */
export interface UserApiConfig {
    jinaApiKey?: string | null;
    tavilyApiKey?: string | null;
    searchProvider?: string | null;
    ncbiApiKey?: string | null;
}

/**
 * LLM API配置接口
 */
export interface UserLlmApiConfig {
    openaiBaseUrl?: string | null;
    openaiApiKey?: string | null;
    openaiApiModel?: string | null;
    deepseekApiKey?: string | null;
    deepseekBaseUrl?: string | null;
    geminiApiKey?: string | null;
    geminiBaseUrl?: string | null;
}

/**
 * 获取用户的API配置
 * 优先从数据库获取，如果字段为空则从环境变量获取
 * @param userId 用户ID
 * @returns 用户API配置
 */
export async function getUserApiConfigForSearch(userId?: string | null): Promise<{
    jinaApiKey?: string;
    tavilyApiKey?: string;
    searchProvider?: string;
    ncbiApiKey?: string;
}> {
    let config: UserApiConfig = {
        jinaApiKey: null,
        tavilyApiKey: null,
        searchProvider: null,
        ncbiApiKey: null,
    };

    // 如果提供了 userId，尝试从数据库获取配置
    if (userId) {
        try {
            const userConfig = await prisma.userApiConfig.findUnique({
                where: { userId },
                select: {
                    jinaApiKey: true,
                    tavilyApiKey: true,
                    searchProvider: true,
                    ncbiApiKey: true,
                },
            });

            if (userConfig) {
                config = userConfig;
            }
        } catch (error) {
            console.error('获取用户API配置失败:', error);
            // 如果数据库查询失败，继续使用环境变量
        }
    }

    // 如果数据库中的值为空，则从环境变量获取
    return {
        jinaApiKey: config.jinaApiKey || process.env.JINA_API_KEY,
        tavilyApiKey: config.tavilyApiKey || process.env.TAVILY_API_KEY,
        searchProvider: config.searchProvider || process.env.SEARCH_PROVIDER,
        ncbiApiKey: config.ncbiApiKey || process.env.NCBI_API_KEY,
    };
}

/**
 * 获取用户的LLM API配置
 * 优先从数据库获取，如果字段为空则从环境变量获取
 * @param userId 用户ID
 * @returns 用户LLM API配置
 */
export async function getUserLlmApiConfig(userId?: string | null): Promise<{
    openaiBaseUrl?: string;
    openaiApiKey?: string;
    openaiApiModel?: string;
    deepseekApiKey?: string;
    deepseekBaseUrl?: string;
    geminiApiKey?: string;
    geminiBaseUrl?: string;
}> {
    let config: UserLlmApiConfig = {
        openaiBaseUrl: null,
        openaiApiKey: null,
        openaiApiModel: null,
        deepseekApiKey: null,
        deepseekBaseUrl: null,
        geminiApiKey: null,
        geminiBaseUrl: null,
    };

    // 如果提供了 userId，尝试从数据库获取配置
    if (userId) {
        try {
            const userConfig = await prisma.userApiConfig.findUnique({
                where: { userId },
                select: {
                    openaiBaseUrl: true,
                    openaiApiKey: true,
                    openaiApiModel: true,
                    deepseekApiKey: true,
                    deepseekBaseUrl: true,
                    geminiApiKey: true,
                    geminiBaseUrl: true,
                },
            });

            if (userConfig) {
                config = userConfig;
            }
        } catch (error) {
            console.error('获取用户LLM API配置失败:', error);
            // 如果数据库查询失败，继续使用环境变量
        }
    }

    // 如果数据库中的值为空，则从环境变量获取
    return {
        openaiBaseUrl: config.openaiBaseUrl || process.env.OPENAI_BASE_URL || process.env.OPENAI_API_BASE,
        openaiApiKey: config.openaiApiKey || process.env.OPENAI_API_KEY,
        openaiApiModel: config.openaiApiModel || process.env.OPENAI_API_MODEL,
        deepseekApiKey: config.deepseekApiKey || process.env.DEEPSEEK_API_KEY,
        deepseekBaseUrl: config.deepseekBaseUrl || process.env.DEEPSEEK_BASE_URL,
        geminiApiKey: config.geminiApiKey || process.env.GEMINI_API_KEY,
        geminiBaseUrl: config.geminiBaseUrl || process.env.GEMINI_BASE_URL,
    };
}

