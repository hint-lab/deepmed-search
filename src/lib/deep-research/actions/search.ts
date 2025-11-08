/**
 * Search Action Handler
 * 
 * 处理搜索动作，负责在互联网上查找相关信息。
 * 
 * 核心功能：
 * 1. 初始搜索：执行 LLM 生成的搜索查询
 * 2. 查询重写：基于初始搜索结果（soundbites）优化搜索关键词
 * 3. 二次搜索：使用优化后的查询进行更精准的搜索
 * 4. 去重：避免重复搜索相同的关键词
 * 5. 限制数量：控制每步搜索的查询数量
 * 
 * 搜索流程：
 * - 原始查询 -> 去重 -> 初始搜索 -> 提取关键信息 -> 查询重写 -> 去重 -> 二次搜索
 * 
 * @param thisAgent - 研究代理实例
 * @param action - 搜索动作对象，包含搜索查询列表
 * @param currentQuestion - 当前正在研究的问题
 */

import {
    SearchAction, KnowledgeItem, TrackerContext, SearchSnippet, WebContent
} from '../types';
import { chooseK } from "../utils/text-tools";
import { dedupQueries } from '../tools/jina-dedup';
import { executeSearchQueries } from '../search';
import { rewriteQuery } from '../tools/query-rewriter';
import { MAX_QUERIES_PER_STEP } from '../utils/schemas';
import { Schemas } from "../utils/schemas";
import { ResearchAgent } from '../agent';
import { updateContextHelper } from '../agent-helpers';
import { publishThink } from '../tracker-store';

export async function handleSearchAction(thisAgent: ResearchAgent, action: SearchAction, currentQuestion: string): Promise<void> {
    console.log("Handling Search Action for:", currentQuestion);
    const context = thisAgent.context as TrackerContext;
    const allKeywords = thisAgent.allKeywords as string[];
    const allURLs = thisAgent.allURLs as Record<string, SearchSnippet>;
    const SchemaGen = thisAgent.SchemaGen as Schemas;
    const allWebContents = thisAgent.allWebContents as Record<string, WebContent>;
    const allKnowledge = thisAgent.allKnowledge as KnowledgeItem[];
    const options = (thisAgent as any).options; // Cast to any to access options
    const diaryContext = thisAgent.diaryContext as string[];
    const step = thisAgent.step as number;
    await publishThink(thisAgent.context.taskId, `步骤 ${step}: 开始搜索`);
    
    // ========== 1. 验证和去重搜索查询 ==========
    // 防御性检查：确保 searchRequests 是有效数组
    if (!action.searchRequests || !Array.isArray(action.searchRequests)) {
        console.error(`[handleSearchAction] Invalid searchRequests for step ${step}`, action);
        action.searchRequests = [];
    }
    
    // 去重并限制数量
    action.searchRequests = chooseK((await dedupQueries(action.searchRequests, allKeywords, context.tokenTracker!)).unique_queries, MAX_QUERIES_PER_STEP);

    // ========== 2. 执行初始搜索 ==========
    let initialNewKnowledge: KnowledgeItem[] = [];
    if (action.searchRequests.length > 0) {
        const { searchedQueries: initialSearchedQueries, newKnowledge } = await executeSearchQueries(
            action.searchRequests.map((q: string) => ({ q })), // Pass queries correctly
            context,
            allURLs,
            SchemaGen,
            allWebContents
        );
        allKeywords.push(...initialSearchedQueries);
        initialNewKnowledge = newKnowledge;  // 保存用于查询重写
        allKnowledge.push(...initialNewKnowledge);
    }

    // ========== 3. 基于初始结果重写查询 ==========
    // 从初始搜索结果中提取关键信息（soundbites）
    const soundBites = initialNewKnowledge.map(k => k.answer).join(' ');
    let keywordsQueries = await rewriteQuery(action, soundBites, context, SchemaGen);
    
    // ========== 4. 去重重写后的查询 ==========
    const qOnly = keywordsQueries.filter(q => q.q).map(q => q.q);
    const uniqQOnly = chooseK((await dedupQueries(qOnly, allKeywords, context.tokenTracker!)).unique_queries, MAX_QUERIES_PER_STEP);
    keywordsQueries = uniqQOnly.map(q => {
        const matches = keywordsQueries.filter(kq => kq.q === q);
        return matches.length > 1 ? { q } : matches[0];  // 保留原始查询对象
    });
    
    // ========== 5. 执行优化后的搜索 ==========
    let anyResult = false;
    let finalSearchedQueries: string[] = [];
    let finalNewKnowledge: KnowledgeItem[] = [];
    if (keywordsQueries.length > 0) {
        const { searchedQueries, newKnowledge } = await executeSearchQueries(
            keywordsQueries,
            context,
            allURLs,
            SchemaGen,
            allWebContents,
            options.onlyHostnames // Pass onlyHostnames option
        );
        finalSearchedQueries = searchedQueries;
        finalNewKnowledge = newKnowledge;
        if (finalSearchedQueries.length > 0) {
            anyResult = true;
            // 更新关键词和知识库
            allKeywords.push(...finalSearchedQueries);
            allKnowledge.push(...finalNewKnowledge);
        }
    }

    // ========== 6. 更新日志和上下文 ==========
    if (anyResult) {
        // 搜索成功，找到新信息
        diaryContext.push(`
At step ${step}, you took the **search** action and look for external information for the question: "${currentQuestion}".
In particular, you tried to search for the following keywords: "${keywordsQueries.map(q => q.q).join(', ')}".
You found quite some information and add them to your URL list and **visit** them later when needed. 
`);
        updateContextHelper(thisAgent, {
            question: currentQuestion,
            ...action,
            result: { searchedQueries: finalSearchedQueries, newKnowledge: finalNewKnowledge }
        });
    } else {
        // 搜索失败或所有查询都是重复的
        diaryContext.push(`
At step ${step}, you took the **search** action and look for external information for the question: "${currentQuestion}".
In particular, you tried to search for the following keywords:  "${keywordsQueries.map(q => q.q).join(', ')}".
But then you realized you have already searched for these keywords before, or the rewritten queries yielded no results. No new information is returned.
You decided to think out of the box or cut from a completely different angle.
`);
        updateContextHelper(thisAgent, {
            ...action,
            result: 'You have tried all possible queries and found no new information. You must think out of the box or different angle!!!'
        });
    }
    
    // ========== 7. 更新控制标志 ==========
    // 防止连续多次搜索，确保 Agent 采取其他行动
    (thisAgent as any).allowSearch = false;
    (thisAgent as any).allowAnswer = false;  // 搜索后不能立即回答，需要先访问 URL
} 