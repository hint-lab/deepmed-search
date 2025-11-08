/**
 * Visit Action Handler
 * 
 * 处理访问 URL 的动作，负责深入阅读网页内容并提取有价值的信息。
 * 
 * 核心功能：
 * 1. URL 规范化：处理各种格式的 URL 输入（索引号或直接 URL）
 * 2. 去重：避免重复访问相同的 URL
 * 3. 智能选择：结合 LLM 指定的 URL 和系统推荐的高权重 URL
 * 4. 内容提取：使用 Jina Reader API 提取网页的结构化内容
 * 5. 知识生成：基于网页内容生成问答对，添加到知识库
 * 6. 限制数量：控制每步访问的 URL 数量
 * 
 * URL 来源：
 * - action.URLTargets: LLM 指定的 URL（可以是索引号或完整 URL）
 * - weightedURLs: 系统根据相关性排序的推荐 URL
 * 
 * @param thisAgent - 研究代理实例
 * @param action - 访问动作对象，包含目标 URL 列表
 */

import {
    VisitAction, KnowledgeItem, TrackerContext, SearchSnippet, WebContent, BoostedSearchSnippet
} from '../types';
import { normalizeUrl, processURLs } from "../utils/url-tools";
import { MAX_URLS_PER_STEP, Schemas } from '../utils/schemas';
import { ResearchAgent } from '../agent';
import { updateContextHelper } from '../agent-helpers';
import { publishVisitUrl } from '../tracker-store';

export async function handleVisitAction(thisAgent: ResearchAgent, action: VisitAction): Promise<void> {
    console.log("Handling Visit Action");

    const weightedURLs = thisAgent.weightedURLs as BoostedSearchSnippet[];
    const visitedURLs = thisAgent.visitedURLs as string[];
    const context = thisAgent.context as TrackerContext;
    const allKnowledge = thisAgent.allKnowledge as KnowledgeItem[];
    const allURLs = thisAgent.allURLs as Record<string, SearchSnippet>;
    const badURLs = thisAgent.badURLs as string[];
    const SchemaGen = thisAgent.SchemaGen as Schemas;
    const gaps = thisAgent.gaps as string[];
    const totalStep = thisAgent.totalStep as number;
    const question = thisAgent.question as string;
    const allWebContents = thisAgent.allWebContents as Record<string, WebContent>;
    const diaryContext = thisAgent.diaryContext as string[];
    const step = thisAgent.step as number;

    // ========== 1. 规范化和去重 URL ==========
    const urlListForAction = (weightedURLs || []).map(r => r.url);
    
    // 处理 LLM 指定的目标 URL（可以是索引号或完整 URL）
    const initialTargets = (action.URLTargets || [])
        .map(target => {
            if (typeof target === 'number' && target > 0 && target <= urlListForAction.length) {
                // 索引号：从 weightedURLs 中获取对应的 URL
                return normalizeUrl(urlListForAction[target - 1]);
            } else if (typeof target === 'string') {
                // 完整 URL：直接规范化
                return normalizeUrl(target);
            }
            return null;
        })
        .filter(url => url && !visitedURLs.includes(url)) as string[];

    // 合并 LLM 指定的 URL 和系统推荐的高权重 URL
    const combinedTargets = [...new Set([...initialTargets, ...weightedURLs.slice(0, MAX_URLS_PER_STEP).map(r => r.url!)])];
    const uniqueURLs = combinedTargets.filter(url => !visitedURLs.includes(url)).slice(0, MAX_URLS_PER_STEP);

    console.log("Visiting URLs:", uniqueURLs);

    // 通知前端正在访问的 URL
    if (uniqueURLs.length > 0) {
        await publishVisitUrl(context.taskId, uniqueURLs);
    }

    // ========== 2. 处理 URL（提取内容并生成知识）==========
    if (uniqueURLs.length > 0) {
        const { urlResults, success } = await processURLs(
            uniqueURLs,
            context,
            allKnowledge,
            allURLs,
            visitedURLs,  // 会被 processURLs 更新
            badURLs,      // 会被 processURLs 更新
            SchemaGen,
            gaps[totalStep % gaps.length] || question,  // 当前问题上下文
            allWebContents  // 会被 processURLs 更新
        );

        // ========== 3. 更新日志 ==========
        diaryContext.push(success
            ? `At step ${step}, you took the **visit** action and deep dive into the following URLs:\n${(urlResults || []).map(r => r?.url).join('\n')}\nYou found some useful information on the web and add them to your knowledge for future reference.`
            : `At step ${step}, you took the **visit** action and try to visit some URLs but failed to read the content. You need to think out of the box or cut from a completely different angle.`
        );

        // ========== 4. 更新上下文 ==========
        updateContextHelper(thisAgent, {
            totalStep: totalStep,
            ...(success ? {
                question: gaps[totalStep % gaps.length] || question,
                ...action,
                URLTargets: uniqueURLs,
                result: urlResults
            } : {
                ...action,
                URLTargets: uniqueURLs,
                result: 'You have tried all possible URLs and found no new information. You must think out of the box or different angle!!!'
            })
        });

    } else {
        // 没有可访问的 URL（都已访问过或列表为空）
        diaryContext.push(`
At step ${step}, you took the **visit** action. But then you realized you have already visited these URLs or there were no relevant URLs to visit.
You decided to think out of the box or cut from a completely different angle.`);

        updateContextHelper(thisAgent, {
            totalStep: totalStep,
            ...action,
            URLTargets: [],
            result: 'You have visited all possible URLs or found no relevant ones. You must think out of the box or different angle!!!'
        });
    }

    // ========== 5. 更新控制标志 ==========
    // 防止连续多次访问，确保 Agent 采取其他行动
    (thisAgent as any).allowRead = false;
}
