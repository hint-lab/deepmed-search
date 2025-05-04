'use server';

import { searchPubMed, PubMedSearchResult } from '@/lib/pubmed';

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