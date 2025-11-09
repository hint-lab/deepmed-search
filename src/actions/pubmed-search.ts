'use server';

import { searchPubMed, PubMedSearchResult } from '@/lib/pubmed';
import { ProviderFactory, ProviderType } from '@/lib/llm-provider';
import { withAuth } from '@/lib/auth-utils';
import { Session } from 'next-auth';

/**
 * Server Action用于从服务器端执行PubMed搜索
 * 避免客户端直接调用外部API时遇到的CORS问题
 */
export async function searchPubMedAction(
    query: string,
    resultsPerPage: number = 10,
    page: number = 1
): Promise<{ success: boolean; data?: PubMedSearchResult; error?: string }> {
    if (!query.trim()) {
        return {
            success: false,
            error: '搜索关键词不能为空'
        };
    }

    try {
        console.log(`[Server Action] 执行PubMed搜索: "${query}", 页码: ${page}, 每页结果: ${resultsPerPage}`);
        const result = await searchPubMed(query, resultsPerPage, page);

        console.log(`[Server Action] 搜索成功, 找到${result.count}条结果, 返回${result.articles.length}条`);
        return {
            success: true,
            data: result
        };
    } catch (error: any) {
        console.error(`[Server Action] PubMed搜索失败:`, error);
        return {
            success: false,
            error: error.message || '搜索PubMed文章失败'
        };
    }
}

/**
 * 获取 PubMed 搜索建议
 * 
 * 功能说明：
 * 1. 接收用户的中文查询
 * 2. 使用 DeepSeek 模型来：
 *    - 翻译成英文
 *    - 添加医学术语
 *    - 包含 MeSH 术语
 *    - 提供同义词和变体
 * 3. 返回 3-5 个优化后的英文搜索建议
 * 
 * @param query - 用户输入的中文搜索查询
 * @returns 包含搜索建议的响应对象
 */
export const getPubMedSuggestionsAction = withAuth(async (
    session: Session,
    query: string
): Promise<{ success: boolean; data?: string[]; error?: string }> => {
    if (!query.trim()) {
        return {
            success: false,
            error: '搜索关键词不能为空'
        };
    }

    try {
        const userId = session.user?.id;
        console.log(`[Server Action] 获取PubMed搜索建议: "${query}"${userId ? ` (userId: ${userId})` : ''}`);
        
        // 使用 getProviderForUser 获取用户配置的 provider
        const provider = await ProviderFactory.getProviderForUser(ProviderType.DeepSeek, userId);
        
        const prompt = `Given the following Chinese medical research query: "${query}"
        Please provide 3-5 optimized search queries in English that would be effective for searching PubMed.
        Format: Return only the queries, one per line, without any additional text or numbering.
        Focus on:
        1. Translating to proper medical terminology
        2. Including relevant MeSH terms
        3. Adding common variations or synonyms
        4. Maintaining the core research intent`;

        const response = await provider.chat({
            dialogId: 'pubmed_suggestions',
            input: prompt,
        });
        
        if (!response.content) {
            throw new Error('Failed to get suggestions from LLM');
        }

        // 解析返回的文本，每行作为一个建议
        const suggestions = response.content
            .split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => line.length > 0);

        return {
            success: true,
            data: suggestions
        };
    } catch (error: any) {
        console.error(`[Server Action] 获取PubMed搜索建议失败:`, error);
        return {
            success: false,
            error: error.message || '获取搜索建议失败'
        };
    }
}); 