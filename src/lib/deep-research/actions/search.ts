import {
    SearchAction, KnowledgeItem, TrackerContext, SearchSnippet, WebContent
} from '../types';
import { chooseK } from "../utils/text-tools";
import { dedupQueries } from '../tools/jina-dedup';
import { executeSearchQueries } from '../search'; // Correct import path
import { rewriteQuery } from '../tools/query-rewriter';
import { MAX_QUERIES_PER_STEP } from '../utils/schemas';
import { Schemas } from "../utils/schemas";
import { ResearchAgent } from '../agent'; // Import ResearchAgent for type hints
import { updateContextHelper } from '../agent-helpers'; // Import context helper
import { publishThink } from '../tracker-store';
export async function handleSearchAction(thisAgent: ResearchAgent, action: SearchAction, currentQuestion: string): Promise<void> {
    console.log("Handling Search Action for:", currentQuestion);
    await publishThink(thisAgent.context.taskId, `开始搜索`);
    const context = thisAgent.context as TrackerContext;
    const allKeywords = thisAgent.allKeywords as string[];
    const allURLs = thisAgent.allURLs as Record<string, SearchSnippet>;
    const SchemaGen = thisAgent.SchemaGen as Schemas;
    const allWebContents = thisAgent.allWebContents as Record<string, WebContent>;
    const allKnowledge = thisAgent.allKnowledge as KnowledgeItem[];
    const options = (thisAgent as any).options; // Cast to any to access options
    const diaryContext = thisAgent.diaryContext as string[];
    const step = thisAgent.step as number;

    // 1. Deduplicate queries
    action.searchRequests = chooseK((await dedupQueries(action.searchRequests, allKeywords, context.tokenTracker!)).unique_queries, MAX_QUERIES_PER_STEP);

    // 2. Execute initial search (if any requests left)
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
        initialNewKnowledge = newKnowledge; // Store for soundbites
        allKnowledge.push(...initialNewKnowledge);
        await publishThink(thisAgent.context.taskId, `搜索成功，找到新信息`);
    }

    // 3. Rewrite queries based on soundbites
    const soundBites = initialNewKnowledge.map(k => k.answer).join(' ');
    let keywordsQueries = await rewriteQuery(action, soundBites, context, SchemaGen);
    await publishThink(thisAgent.context.taskId, `重写查询`);
    // 4. Deduplicate rewritten queries
    const qOnly = keywordsQueries.filter(q => q.q).map(q => q.q);
    const uniqQOnly = chooseK((await dedupQueries(qOnly, allKeywords, context.tokenTracker!)).unique_queries, MAX_QUERIES_PER_STEP);
    keywordsQueries = uniqQOnly.map(q => {
        const matches = keywordsQueries.filter(kq => kq.q === q);
        return matches.length > 1 ? { q } : matches[0]; // Keep original query object if unique
    });
    await publishThink(thisAgent.context.taskId, `去重查询`);
    // 5. Execute rewritten search
    let anyResult = false;
    let finalSearchedQueries: string[] = [];
    let finalNewKnowledge: KnowledgeItem[] = [];
    await publishThink(thisAgent.context.taskId, `执行搜索`);
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
        await publishThink(thisAgent.context.taskId, `搜索成功，找到新信息`);
        if (finalSearchedQueries.length > 0) {
            anyResult = true;
            // 6. Update knowledge/keywords
            allKeywords.push(...finalSearchedQueries);
            allKnowledge.push(...finalNewKnowledge);
            await publishThink(thisAgent.context.taskId, `更新知识库`);
        }
    }

    // 7. Update diary context
    if (anyResult) {
        diaryContext.push(`
At step ${step}, you took the **search** action and look for external information for the question: "${currentQuestion}".
In particular, you tried to search for the following keywords: "${keywordsQueries.map(q => q.q).join(', ')}".
You found quite some information and add them to your URL list and **visit** them later when needed. 
`);
        await publishThink(thisAgent.context.taskId, `更新日志`);
        updateContextHelper(thisAgent, {
            question: currentQuestion,
            ...action,
            result: { searchedQueries: finalSearchedQueries, newKnowledge: finalNewKnowledge } // Use final results
        });
    } else {
        diaryContext.push(`
At step ${step}, you took the **search** action and look for external information for the question: "${currentQuestion}".
In particular, you tried to search for the following keywords:  "${keywordsQueries.map(q => q.q).join(', ')}".
But then you realized you have already searched for these keywords before, or the rewritten queries yielded no results. No new information is returned.
You decided to think out of the box or cut from a completely different angle.
`);
        await publishThink(thisAgent.context.taskId, `更新日志`);
        updateContextHelper(thisAgent, {
            ...action,
            result: 'You have tried all possible queries and found no new information. You must think out of the box or different angle!!!'
        });
    }
    // 8. Update agent state (modified in the caller)
    (thisAgent as any).allowSearch = false;
    (thisAgent as any).allowAnswer = false;

    await publishThink(thisAgent.context.taskId, `更新状态`);
} 