'use server';

import { ServerActionResponse } from '@/types/actions';
import { searchTavily } from '@/lib/web-search/tavily';
import { searchDuckDuckGo } from '@/lib/web-search/duckduckgo';
import { searchJina } from '@/lib/web-search/jina'; // Import Jina lib function
import { StandardSearchResult } from '@/lib/web-search/common'; // Import the standard interface
import { getSearchApiKey } from '@/lib/search/config'; // Import user config helper
import { auth } from '@/lib/auth'; // Import auth helper

// Define supported search engine types
export type SearchEngineType = 'tavily' | 'duckduckgo' | 'jina';

/**
 * Consolidated Server Action to perform a web search using the specified engine.
 * @param query The search query string.
 * @param engine The search engine to use ('tavily', 'duckduckgo', 'jina').
 * @returns A ServerActionResponse containing an array of StandardSearchResult or an error message.
 */
export async function performWebSearch(
    query: string,
    engine: SearchEngineType
): Promise<ServerActionResponse<StandardSearchResult[]>> {

    if (!query || query.trim() === '') {
        return { success: false, error: 'Search query cannot be empty.' };
    }

    console.log(`ACTION: Performing web search for "${query}" using engine: ${engine}`);

    try {
        // 获取当前登录用户
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: '请先登录后再使用搜索功能。' };
        }

        let results: StandardSearchResult[] = [];

        switch (engine) {
            case 'tavily':
                try {
                    const tavilyApiKey = await getSearchApiKey('tavily', session.user.id);
                    results = await searchTavily(query, tavilyApiKey);
                } catch (error: any) {
                    console.error('ACTION: Failed to get Tavily API key:', error);
                    return {
                        success: false,
                        error: error.message || 'Tavily search service is not configured. Please configure your Tavily API Key in settings.'
                    };
                }
                break;

            case 'duckduckgo':
                // DuckDuckGo 不需要 API Key，可以直接使用
                results = await searchDuckDuckGo(query);
                break;

            case 'jina':
                try {
                    const jinaApiKey = await getSearchApiKey('jina', session.user.id);
                    results = await searchJina(query, jinaApiKey);
                } catch (error: any) {
                    console.error('ACTION: Failed to get Jina API key:', error);
                    return {
                        success: false,
                        error: error.message || 'Jina search service is not configured. Please configure your Jina API Key in settings.'
                    };
                }
                break;

            default:
                console.warn(`ACTION: Unknown search engine specified: ${engine}`);
                return { success: false, error: `Unknown search engine: ${engine}` };
        }

        console.log(`ACTION: ${engine} search succeeded, returning ${results.length} results.`);
        return { success: true, data: results };

    } catch (error: any) {
        console.error(`ACTION: Error during ${engine} search:`, error);

        // Provide a user-friendly error message based on the engine and potential error details
        let userErrorMessage = `An unexpected error occurred during ${engine} search.`;
        if (engine === 'duckduckgo' && error.message?.includes('VQD')) {
            userErrorMessage = 'Failed to connect to the DuckDuckGo search service after retries. Please try again later.';
        } else if (error.message) {
            userErrorMessage = `${engine.charAt(0).toUpperCase() + engine.slice(1)} search failed: ${error.message}`;
        }
        return { success: false, error: userErrorMessage };
    }
}

// --- (Optional) Remove or comment out the old individual actions ---
/*
export async function performTavilyWebSearchAction(query: string): Promise<ServerActionResponse<StandardSearchResult[]>> { ... }
export async function performDuckDuckGoSearchAction(query: string): Promise<ServerActionResponse<StandardSearchResult[]>> { ... }
export async function performJinaSearchAction(query: string): Promise<ServerActionResponse<StandardSearchResult[]>> { ... }
*/ 