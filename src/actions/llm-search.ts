'use server';

import { searchSimulator, SearchResult } from '@/lib/llm-search';
import { ServerActionResponse } from '@/types/actions';
import { z } from 'zod';

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
        const modelToUse = options?.model; // Get modelId from options
        console.log(`ACTION: Calling LLM Search Simulator for query: "${query}" ${modelToUse ? `with model: ${modelToUse}` : 'using default model'}`);

        // Pass the query and the options object (which might contain modelId)
        const simResponse: SearchResult[] = await searchSimulator(query, modelToUse || 'default');

        // simResponse is already SearchResult[], no need to access .results
        const actionResults: LlmSearchActionResult[] = simResponse; // Assuming LlmSearchActionResult is compatible

        console.log(`ACTION: LLM Search Simulator succeeded, returning ${actionResults.length} results.`);
        return { success: true, data: actionResults };

    } catch (error: any) {
        console.error('ACTION: Error calling LLM Search Simulator:', error);
        return { success: false, error: error.message || "Failed to perform LLM-based search." };
    }
} 