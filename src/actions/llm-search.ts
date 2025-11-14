'use server';

import { searchSimulator, SearchResult, LLMConfig } from '@/lib/llm-search';
import { ServerActionResponse } from '@/types/actions';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decryptApiKey } from '@/lib/crypto';

// Define the Action's specific response structure if needed, or reuse SearchResult
export interface LlmSearchActionResult extends SearchResult {
    // Add any action-specific fields if necessary
}

// 正确的 schema (顶层是对象)
const SearchResultsSchema = z.object({
    results: z.array(z.object({ // 将数组放在对象的 'results' 属性下
        title: z.string().describe("标题"), // 添加描述可能有助于 LLM 理解
        url: z.string().url().describe("链接 URL"),
        snippet: z.string().describe("摘要或片段")
    })).describe("搜索结果列表") // 描述整个数组
});

// 或者如果你只需要一个简单的包装器
const SearchResultsWrapperSchema = z.object({
    searchResults: SearchResultsSchema // 将原 schema 嵌套
});

export async function performLlmSearchAction(
    query: string,
    options?: { model?: string /* Add other potential options here */ }
): Promise<ServerActionResponse<LlmSearchActionResult[]>> {

    try {
        // 获取用户 session
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: '未登录或用户信息不完整' };
        }

        // 获取用户的激活 LLM 配置
        const activeConfig = await prisma.lLMConfig.findFirst({
            where: {
                userId: session.user.id,
                isActive: true,
            },
        });

        if (!activeConfig) {
            return { success: false, error: '未找到激活的 LLM 配置，请前往设置页面配置' };
        }

        // 解密 API Key
        const decryptedApiKey = decryptApiKey(activeConfig.apiKey);

        // 构建用户配置
        const llmConfig: LLMConfig = {
            provider: activeConfig.provider as 'deepseek' | 'openai' | 'google',
            apiKey: decryptedApiKey,
            baseUrl: activeConfig.baseUrl || undefined,
            model: activeConfig.model || undefined,
        };

        const modelToUse = options?.model; // Get modelId from options
        console.log(`ACTION: Calling LLM Search Simulator for query: "${query}" ${modelToUse ? `with model: ${modelToUse}` : 'using default model'}, provider: ${llmConfig.provider}`);

        // 直接传递配置执行搜索
        const simResponse: SearchResult[] = await searchSimulator(query, modelToUse || 'default', llmConfig);

        // simResponse is already SearchResult[], no need to access .results
        const actionResults: LlmSearchActionResult[] = simResponse; // Assuming LlmSearchActionResult is compatible

        console.log(`ACTION: LLM Search Simulator succeeded, returning ${actionResults.length} results.`);
        return { success: true, data: actionResults };

    } catch (error: any) {
        console.error('ACTION: Error calling LLM Search Simulator:', error);
        return { success: false, error: error.message || "Failed to perform LLM-based search." };
    }
} 