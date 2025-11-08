import {
    KnowledgeItem, TrackerContext
} from '../types';
import { ResearchAgent } from '../agent';
import { updateContextHelper } from '../agent-helpers';
import { publishThink } from '../tracker-store';
import { dedupQueries } from '../tools/jina-dedup';

/**
 * Curator Action - 整理和优化知识库
 * 功能：
 * 1. 去重相似知识条目
 * 2. 按相关性和重要性排序
 * 3. 归档低优先级知识
 * 4. 生成知识摘要
 */

interface CurateResult {
    originalCount: number;
    dedupedCount: number;
    archivedCount: number;
    keptCount: number;
}

// 配置参数
const MAX_ACTIVE_KNOWLEDGE = 15;  // 保留在活跃知识库的最大条目数
const MIN_KNOWLEDGE_FOR_CURATION = 10;  // 触发整理的最小知识数量
const SIMILARITY_THRESHOLD = 0.85;  // 相似度阈值（用于去重）

/**
 * 按类型和时间分组知识
 */
function groupKnowledge(knowledge: KnowledgeItem[]): Map<string, KnowledgeItem[]> {
    const groups = new Map<string, KnowledgeItem[]>();
    
    for (const item of knowledge) {
        const type = item.type || 'unknown';
        if (!groups.has(type)) {
            groups.set(type, []);
        }
        groups.get(type)!.push(item);
    }
    
    return groups;
}

/**
 * 计算知识条目的重要性分数
 */
function calculateImportance(
    item: KnowledgeItem,
    currentQuestion: string,
    allQuestions: string[]
): number {
    let score = 0;
    
    // 1. 类型权重
    const typeWeights: Record<string, number> = {
        'qa': 3,      // 问答对最重要
        'url': 2,     // URL 内容次之
        'side-info': 1 // 侧面信息最低
    };
    score += typeWeights[item.type] || 1;
    
    // 2. 与当前问题的相关性
    if (item.question && item.question.toLowerCase().includes(currentQuestion.toLowerCase())) {
        score += 2;
    }
    
    // 3. 与所有问题的相关性
    const questionMatches = allQuestions.filter(q => 
        item.question?.toLowerCase().includes(q.toLowerCase()) ||
        item.answer?.toLowerCase().includes(q.toLowerCase())
    ).length;
    score += Math.min(questionMatches, 3);
    
    // 4. 内容长度（更详细的内容可能更有价值）
    if (item.answer) {
        const answerLength = item.answer.length;
        if (answerLength > 500) score += 2;
        else if (answerLength > 200) score += 1;
    }
    
    // 5. 时间新鲜度（如果有 updated 字段）
    if (item.updated) {
        try {
            const updatedDate = new Date(item.updated);
            const daysSinceUpdate = (Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceUpdate < 7) score += 1;
        } catch (e) {
            // 忽略日期解析错误
        }
    }
    
    return score;
}

/**
 * 对知识条目进行去重
 */
async function deduplicateKnowledge(
    knowledge: KnowledgeItem[],
    context: TrackerContext
): Promise<KnowledgeItem[]> {
    if (knowledge.length <= 1) return knowledge;
    
    // 提取所有答案文本用于去重
    const answers = knowledge.map(k => k.answer || '');
    
    try {
        // 使用现有的 dedupQueries 工具进行语义去重
        const { unique_queries } = await dedupQueries(
            answers,
            [],
            context.tokenTracker
        );
        
        // 创建唯一答案的 Set 用于快速查找
        const uniqueAnswersSet = new Set(unique_queries);
        
        // 保留对应的知识条目
        const uniqueKnowledge: KnowledgeItem[] = [];
        const seenAnswers = new Set<string>();
        
        for (const item of knowledge) {
            const answer = item.answer || '';
            if (uniqueAnswersSet.has(answer) && !seenAnswers.has(answer)) {
                uniqueKnowledge.push(item);
                seenAnswers.add(answer);
            }
        }
        
        return uniqueKnowledge;
    } catch (error) {
        console.warn('Knowledge deduplication failed, returning original:', error);
        return knowledge;
    }
}

/**
 * 生成知识库摘要
 */
function generateKnowledgeSummary(knowledge: KnowledgeItem[]): string {
    const grouped = groupKnowledge(knowledge);
    const lines: string[] = [];
    
    lines.push(`知识库概览（共 ${knowledge.length} 条）：`);
    
    for (const [type, items] of grouped.entries()) {
        lines.push(`- ${type}: ${items.length} 条`);
    }
    
    // 列出最重要的几个主题
    const topQuestions = knowledge
        .filter(k => k.question)
        .slice(0, 5)
        .map(k => k.question);
    
    if (topQuestions.length > 0) {
        lines.push('\n关键问题：');
        topQuestions.forEach((q, i) => {
            lines.push(`${i + 1}. ${q}`);
        });
    }
    
    return lines.join('\n');
}

/**
 * 主要的 Curator 处理函数
 */
export async function handleCurateAction(
    thisAgent: ResearchAgent
): Promise<CurateResult> {
    console.log("Handling Curate Action - 开始整理知识库");
    
    const allKnowledge = thisAgent.allKnowledge as KnowledgeItem[];
    const context = thisAgent.context as TrackerContext;
    const totalStep = thisAgent.totalStep as number;
    const question = thisAgent.question as string;
    const allQuestions = thisAgent.allQuestions as string[];
    const diaryContext = thisAgent.diaryContext as string[];
    
    await publishThink(context.taskId, `步骤 ${totalStep}: 开始整理知识库`);
    
    const originalCount = allKnowledge.length;
    
    // 检查是否需要整理
    if (originalCount < MIN_KNOWLEDGE_FOR_CURATION) {
        console.log(`Knowledge count (${originalCount}) below threshold, skipping curation`);
        return {
            originalCount,
            dedupedCount: originalCount,
            archivedCount: 0,
            keptCount: originalCount
        };
    }
    
    // 1. 去重
    console.log(`Step 1: Deduplicating ${originalCount} knowledge items`);
    const dedupedKnowledge = await deduplicateKnowledge(allKnowledge, context);
    const dedupedCount = dedupedKnowledge.length;
    console.log(`After deduplication: ${dedupedCount} items (removed ${originalCount - dedupedCount})`);
    
    // 2. 计算重要性分数并排序
    console.log('Step 2: Ranking knowledge by importance');
    const rankedKnowledge = dedupedKnowledge
        .map(item => ({
            item,
            score: calculateImportance(item, question, allQuestions)
        }))
        .sort((a, b) => b.score - a.score)
        .map(({ item }) => item);
    
    // 3. 分离活跃知识和归档知识
    const keptKnowledge = rankedKnowledge.slice(0, MAX_ACTIVE_KNOWLEDGE);
    const archivedKnowledge = rankedKnowledge.slice(MAX_ACTIVE_KNOWLEDGE);
    
    console.log(`Step 3: Keeping top ${keptKnowledge.length} items, archiving ${archivedKnowledge.length}`);
    
    // 4. 更新 agent 状态
    thisAgent.allKnowledge = keptKnowledge;
    
    // 初始化归档知识库（如果不存在）
    if (!(thisAgent as any).archivedKnowledge) {
        (thisAgent as any).archivedKnowledge = [];
    }
    (thisAgent as any).archivedKnowledge.push(...archivedKnowledge);
    
    // 5. 生成知识摘要
    const summary = generateKnowledgeSummary(keptKnowledge);
    (thisAgent as any).knowledgeSummary = summary;
    
    console.log('Knowledge Summary:\n', summary);
    
    // 6. 更新日志
    diaryContext.push(`
At step ${totalStep}, the system performed **knowledge curation**:
- Original knowledge items: ${originalCount}
- After deduplication: ${dedupedCount} (removed ${originalCount - dedupedCount} duplicates)
- Kept in active memory: ${keptKnowledge.length}
- Archived for later reference: ${archivedKnowledge.length}

The knowledge base has been reorganized and optimized for better retrieval and relevance.
`);
    
    // 7. 更新上下文
    updateContextHelper(thisAgent, {
        totalStep,
        action: 'curate',
        result: {
            originalCount,
            dedupedCount,
            archivedCount: archivedKnowledge.length,
            keptCount: keptKnowledge.length,
            summary
        }
    });
    
    await publishThink(
        context.taskId,
        `✅ 知识库整理完成：保留 ${keptKnowledge.length} 条，归档 ${archivedKnowledge.length} 条`
    );
    
    return {
        originalCount,
        dedupedCount,
        archivedCount: archivedKnowledge.length,
        keptCount: keptKnowledge.length
    };
}

/**
 * 检查是否应该触发 Curator
 */
export function shouldTriggerCurate(
    knowledgeCount: number,
    lastCurateStep: number,
    currentStep: number
): boolean {
    // 条件1：知识数量超过阈值
    if (knowledgeCount >= MIN_KNOWLEDGE_FOR_CURATION * 2) {
        return true;
    }
    
    // 条件2：距离上次整理已经过了5步，且知识数量超过最小阈值
    if (
        knowledgeCount >= MIN_KNOWLEDGE_FOR_CURATION &&
        currentStep - lastCurateStep >= 5
    ) {
        return true;
    }
    
    return false;
}

