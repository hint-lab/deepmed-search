import {
    KnowledgeItem, TrackerContext
} from '../types';
import { ResearchAgent } from '../agent';
import { updateContextHelper } from '../agent-helpers';
import { publishThink } from '../tracker-store';
import { dedupQueries } from '../tools/jina-dedup';

/**
 * Curator Action - 知识库管理器
 * 
 * 负责整理和优化知识库，防止知识条目过多导致上下文膨胀和检索效率下降。
 * 
 * 核心功能：
 * 1. 语义去重：使用 Jina API 进行语义相似度检测，移除重复或高度相似的知识条目
 * 2. 重要性评分：基于多个维度（类型、相关性、长度、新鲜度）计算知识条目的重要性
 * 3. 智能归档：保留最重要的 N 条知识在活跃内存中，其余归档以备后续检索
 * 4. 知识摘要：生成知识库概览，帮助 Agent 快速了解当前知识状态
 * 
 * 触发条件：
 * - 知识数量超过阈值的 2 倍
 * - 距离上次整理超过 5 步且知识数量超过最小阈值
 */

/**
 * 整理结果统计
 */
interface CurateResult {
    originalCount: number;    // 原始知识条目数
    dedupedCount: number;     // 去重后的条目数
    archivedCount: number;    // 归档的条目数
    keptCount: number;        // 保留在活跃内存的条目数
}

// ========== 配置参数 ==========
const MAX_ACTIVE_KNOWLEDGE = 15;           // 保留在活跃知识库的最大条目数
const MIN_KNOWLEDGE_FOR_CURATION = 10;     // 触发整理的最小知识数量
const SIMILARITY_THRESHOLD = 0.85;         // 相似度阈值（用于去重，暂未使用）

/**
 * 按类型分组知识
 * 
 * 将知识条目按类型（qa, url, side-info）分组，便于统计和展示
 * 
 * @param knowledge - 知识条目数组
 * @returns 按类型分组的 Map
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
 * 
 * 基于多个维度评估知识条目的价值：
 * 1. 类型权重：qa > url > side-info
 * 2. 与当前问题的相关性
 * 3. 与所有问题的相关性
 * 4. 内容详细程度（长度）
 * 5. 时间新鲜度
 * 
 * @param item - 知识条目
 * @param currentQuestion - 当前正在研究的问题
 * @param allQuestions - 所有相关问题列表
 * @returns 重要性分数（越高越重要）
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
 * 对知识条目进行语义去重
 * 
 * 使用 Jina API 的语义相似度检测，识别并移除重复或高度相似的知识条目。
 * 这比简单的文本匹配更智能，能识别语义相同但表述不同的内容。
 * 
 * @param knowledge - 待去重的知识条目数组
 * @param context - 跟踪上下文（用于 token 计数）
 * @returns 去重后的知识条目数组
 */
async function deduplicateKnowledge(
    knowledge: KnowledgeItem[],
    context: TrackerContext
): Promise<KnowledgeItem[]> {
    if (knowledge.length <= 1) return knowledge;
    
    // 提取所有答案文本用于去重
    const answers = knowledge.map(k => k.answer || '');
    
    try {
        // 使用 Jina API 进行语义去重
        const { unique_queries } = await dedupQueries(
            answers,
            [],
            context.tokenTracker
        );
        
        // 创建唯一答案的 Set 用于快速查找
        const uniqueAnswersSet = new Set(unique_queries);
        
        // 保留对应的知识条目（保持原始顺序）
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
 * 
 * 创建一个简洁的知识库概览，包括：
 * - 总条目数和类型分布
 * - 最重要的几个关键问题
 * 
 * 这个摘要可以帮助 Agent 快速了解当前掌握的知识状态
 * 
 * @param knowledge - 知识条目数组
 * @returns 格式化的摘要文本
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
 * Curator 主处理函数
 * 
 * 执行完整的知识库整理流程：
 * 1. 检查是否需要整理（知识数量阈值）
 * 2. 语义去重
 * 3. 计算重要性分数并排序
 * 4. 分离活跃知识和归档知识
 * 5. 生成知识摘要
 * 6. 更新 Agent 状态和日志
 * 
 * @param thisAgent - 研究代理实例
 * @returns 整理结果统计
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
    
    // ========== 步骤 0: 检查是否需要整理 ==========
    if (originalCount < MIN_KNOWLEDGE_FOR_CURATION) {
        console.log(`Knowledge count (${originalCount}) below threshold, skipping curation`);
        return {
            originalCount,
            dedupedCount: originalCount,
            archivedCount: 0,
            keptCount: originalCount
        };
    }
    
    // ========== 步骤 1: 语义去重 ==========
    console.log(`Step 1: Deduplicating ${originalCount} knowledge items`);
    const dedupedKnowledge = await deduplicateKnowledge(allKnowledge, context);
    const dedupedCount = dedupedKnowledge.length;
    console.log(`After deduplication: ${dedupedCount} items (removed ${originalCount - dedupedCount})`);
    
    // ========== 步骤 2: 计算重要性分数并排序 ==========
    console.log('Step 2: Ranking knowledge by importance');
    const rankedKnowledge = dedupedKnowledge
        .map(item => ({
            item,
            score: calculateImportance(item, question, allQuestions)
        }))
        .sort((a, b) => b.score - a.score)  // 降序排序，分数高的在前
        .map(({ item }) => item);
    
    // ========== 步骤 3: 分离活跃知识和归档知识 ==========
    const keptKnowledge = rankedKnowledge.slice(0, MAX_ACTIVE_KNOWLEDGE);
    const archivedKnowledge = rankedKnowledge.slice(MAX_ACTIVE_KNOWLEDGE);
    
    console.log(`Step 3: Keeping top ${keptKnowledge.length} items, archiving ${archivedKnowledge.length}`);
    
    // ========== 步骤 4: 更新 Agent 状态 ==========
    thisAgent.allKnowledge = keptKnowledge;
    
    // 初始化归档知识库（如果不存在）
    if (!(thisAgent as any).archivedKnowledge) {
        (thisAgent as any).archivedKnowledge = [];
    }
    (thisAgent as any).archivedKnowledge.push(...archivedKnowledge);
    
    // ========== 步骤 5: 生成知识摘要 ==========
    const summary = generateKnowledgeSummary(keptKnowledge);
    (thisAgent as any).knowledgeSummary = summary;
    
    console.log('Knowledge Summary:\n', summary);
    
    // ========== 步骤 6: 更新日志 ==========
    diaryContext.push(`
At step ${totalStep}, the system performed **knowledge curation**:
- Original knowledge items: ${originalCount}
- After deduplication: ${dedupedCount} (removed ${originalCount - dedupedCount} duplicates)
- Kept in active memory: ${keptKnowledge.length}
- Archived for later reference: ${archivedKnowledge.length}

The knowledge base has been reorganized and optimized for better retrieval and relevance.
`);
    
    // ========== 步骤 7: 更新上下文 ==========
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
 * 检查是否应该触发知识库整理
 * 
 * 根据知识数量和步骤间隔判断是否需要进行整理。
 * 
 * 触发条件（满足任一即可）：
 * 1. 知识数量超过阈值的 2 倍（紧急整理）
 * 2. 距离上次整理超过 5 步且知识数量超过最小阈值（定期整理）
 * 
 * @param knowledgeCount - 当前知识条目数量
 * @param lastCurateStep - 上次整理时的步骤数
 * @param currentStep - 当前步骤数
 * @returns 是否应该触发整理
 */
export function shouldTriggerCurate(
    knowledgeCount: number,
    lastCurateStep: number,
    currentStep: number
): boolean {
    // 条件1：知识数量超过阈值的 2 倍（紧急整理）
    if (knowledgeCount >= MIN_KNOWLEDGE_FOR_CURATION * 2) {
        return true;
    }
    
    // 条件2：距离上次整理已经过了 5 步，且知识数量超过最小阈值（定期整理）
    if (
        knowledgeCount >= MIN_KNOWLEDGE_FOR_CURATION &&
        currentStep - lastCurateStep >= 5
    ) {
        return true;
    }
    
    return false;
}

