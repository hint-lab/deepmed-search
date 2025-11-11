import { CoreMessage } from 'ai';
import { STEP_SLEEP } from './config';
import { TokenTracker } from './utils/token-tracker';
import { ActionTracker } from './utils/action-tracker';
import { ObjectGeneratorSafe } from "./utils/safe-generator";
import { Schemas } from "./utils/schemas";
import { sleep } from './utils/common';
import {
    StepAction,
    AnswerAction,
    ReflectAction,
    SearchAction,
    VisitAction,
    KnowledgeItem,
    TrackerContext,
    SearchSnippet,
    BoostedSearchSnippet,
    WebContent,
    Reference,
    RepeatEvaluationType
} from './types';
import {
    addToAllURLs,
    normalizeUrl,
    getLastModified,
    extractUrlsWithDescription
} from "./utils/url-tools";
import { MAX_REFLECT_PER_STEP } from './utils/schemas';

// Import helpers
import {
    initializeEvaluationMetricsHelper, determineNextActionHelper, updateContextHelper,
    generateFinalAnswerHelper, processFinalAnswerHelper, rankURLsHelper
} from './agent-helpers';

// Import action handlers
import { handleSearchAction } from './actions/search';
import { handleVisitAction } from './actions/visit';
import { handleReflectAction } from './actions/reflect';
import { handleAnswerAction } from './actions/answer';

// Import publishThink function
import { publishThink } from './tracker-store';

// --- ResearchAgent Class ---

/**
 * ResearchAgent 的配置选项接口
 */
export interface ResearchAgentOptions {
    userId: string; // 用户ID（必需：用于获取用户配置的API keys）
    question: string; // 初始研究问题
    messages: CoreMessage[]; // 对话历史
    tokenBudget: number; // Token 预算
    maxBadAttempts: number; // 评估失败的最大尝试次数
    existingContext?: Partial<TrackerContext>; // 可选的现有追踪器上下文
    numReturnedURLs: number; // 最终返回的 URL 数量
    noDirectAnswer: boolean; // 是否禁止第一步直接回答
    boostHostnames: string[]; // 需要提升权重的域名列表
    badHostnames: string[]; // 需要过滤掉的域名列表
    onlyHostnames: string[]; // 只搜索指定的域名列表
    maxRef: number; // 答案中包含的最大参考文献数量
    minRelScore: number; // 参考文献的最低相关性分数
}

/**
 * ResearchAgent 类，负责执行深度研究任务
 */
export class ResearchAgent {
    public userId: string;                       // 用户ID（必需：用于获取用户配置的API keys）
    public options: ResearchAgentOptions;        // Agent 配置选项
    public context: TrackerContext;              // 追踪器上下文 (token, action)
    public SchemaGen: Schemas;                  // 用于生成 Zod schema 的实例
    public generator: ObjectGeneratorSafe;      // 用于安全生成结构化对象的实例
    public step: number = 0;                     // 当前反思周期内的步骤数
    public totalStep: number = 0;                // 总步骤数
    public question: string;                     // 原始研究问题
    public messages: CoreMessage[];              // 对话历史消息
    public gaps: string[];                       // 当前需要解答的问题列表（知识空白）
    public allQuestions: string[];               // 所有提出过的问题（包括原始问题和子问题）
    public allKeywords: string[] = [];            // 所有搜索过的关键词
    public allKnowledge: KnowledgeItem[] = [];    // 收集到的知识条目
    public diaryContext: string[] = [];           // Agent 的思考日志
    public weightedURLs: BoostedSearchSnippet[] = []; // 根据权重排序的待访问 URL
    public msgWithKnowledge: CoreMessage[] = [];   // 结合了知识库的消息，用于 LLM 输入
    public thisStep: StepAction | null = null;     // 当前步骤执行的动作
    public allURLs: Record<string, SearchSnippet> = {}; // 所有遇到过的 URL 及其信息
    public allWebContents: Record<string, WebContent> = {}; // 所有访问过的网页内容
    public visitedURLs: string[] = [];            // 已经访问过的 URL 列表
    public badURLs: string[] = [];                // 访问失败或无效的 URL 列表
    public evaluationMetrics: Record<string, RepeatEvaluationType[]> = {}; // 每个问题的评估指标和剩余尝试次数
    public finalAnswerPIP: string[] = [];         // 最终答案的改进计划 (来自评估)
    public trivialQuestion: boolean = false;       // 是否为简单问题（第一步可直接回答）
    public allContext: StepAction[] = [];         // 存储所有执行过的步骤动作

    // 控制标志 (Control Flags)
    public allowAnswer: boolean = true;           // 是否允许执行 answer 动作
    public allowSearch: boolean = true;           // 是否允许执行 search 动作
    public allowRead: boolean = true;             // 是否允许执行 visit (read) 动作
    public allowReflect: boolean = true;          // 是否允许执行 reflect 动作

    /**
     * 构造函数，初始化 Agent
     * @param options Agent 配置选项
     */
    constructor(options: ResearchAgentOptions) {
        this.userId = options.userId; // 保存用户ID
        this.options = options;
        this.question = options.question.trim();
        this.messages = options.messages;

        // 强化 taskId 检查
        const taskId = options.existingContext?.taskId;
        if (!taskId) {
            throw new Error("[ResearchAgent] taskId is missing in existingContext");
        }

        // 确保上下文正确传递
        this.context = {
            taskId: taskId,
            tokenTracker: options.existingContext?.tokenTracker || new TokenTracker(taskId, options.tokenBudget),
            actionTracker: options.existingContext?.actionTracker || new ActionTracker(taskId)
        };

        // 初始化工具（传递 userId）
        this.SchemaGen = new Schemas();
        this.generator = new ObjectGeneratorSafe(this.context.tokenTracker, this.userId);

        // 基于问题和消息初始化状态
        this.gaps = [this.question]; // 初始知识空白为原始问题
        this.allQuestions = [this.question];

        // 从消息中提取初始 URL
        this.messages.forEach(m => {
            let strMsg = '';
            if (typeof m.content === 'string') {
                strMsg = m.content.trim();
            } else if (typeof m.content === 'object' && Array.isArray(m.content)) {
                strMsg = m.content.filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
            }
            extractUrlsWithDescription(strMsg).forEach(u => {
                addToAllURLs(u, this.allURLs);
            });
        });

        if (!this.context.tokenTracker) {
            throw new Error("Token tracker is not initialized");
        }

        // 异步初始化 Schema 语言，确保传递 taskId
        this.SchemaGen.setLanguage(this.question, this.context.tokenTracker).catch(err => {
            console.error("Failed to set schema language during initialization:", err);
            // 可以在这里处理错误，例如回退到默认语言
        });
    }

    // --- Agent 核心逻辑方法 ---

    /**
     * 主执行循环，Agent 在此循环中决定并执行动作，直到满足停止条件
     */
    private async _runMainLoop(): Promise<void> {
        const regularBudget = this.options.tokenBudget * 0.85; // 为最后生成答案保留部分预算
        while (this.context.tokenTracker!.getTotalUsage().totalTokens < regularBudget) {
            this.step++;
            this.totalStep++;
            const budgetPercentage = (this.context.tokenTracker!.getTotalUsage().totalTokens / this.options.tokenBudget * 100).toFixed(2);
            console.log(`Step ${this.totalStep} / Budget used ${budgetPercentage}%`);
            console.log('Gaps:', this.gaps);

            // 根据剩余 gap 数量决定是否允许 reflect
            this.allowReflect = this.allowReflect && (this.gaps.length <= MAX_REFLECT_PER_STEP);
            // 选择当前要处理的问题 (轮询 gaps)
            const currentQuestion: string = this.gaps[this.totalStep % this.gaps.length];

            // 发布当前步骤的思考消息
            await publishThink(this.context.taskId, `步骤 ${this.totalStep}: 正在思考问题 "${currentQuestion}"`);

            // 初始化当前问题的评估指标 (如果需要)
            initializeEvaluationMetricsHelper(this, currentQuestion);

            // 处理第一步的新鲜度评估约束
            if (this.totalStep === 1 && this.evaluationMetrics[currentQuestion]?.some(e => e.type === 'freshness')) {
                this.allowAnswer = false;
                this.allowReflect = false;
            }

            // 对 URL 进行排序和过滤
            this.weightedURLs = await rankURLsHelper(this);
            console.log('Weighted URLs:', this.weightedURLs.length);

            // 根据加权 URL 数量决定是否允许 visit/search
            this.allowRead = this.allowRead && (this.weightedURLs.length > 0);
            this.allowSearch = this.allowSearch && (this.weightedURLs.length < 50); // 可以调整阈值

            // 使用 LLM 决定下一步动作
            const nextAction = await determineNextActionHelper(this, currentQuestion);
            if (!nextAction) {
                console.error("Failed to determine next action.");
                console.error("Context state:", {
                    totalStep: this.totalStep,
                    knowledgeCount: this.allKnowledge.length,
                    weightedURLsCount: this.weightedURLs.length,
                    gapsCount: this.gaps.length
                });

                // 尝试后备策略：如果有足够的知识，尝试回答；否则尝试重新搜索
                if (this.allKnowledge.length >= 3) {
                    const knowledgeInfo = this.allKnowledge.length > 15
                        ? `知识较多（${this.allKnowledge.length} 条），将选择最相关的 15 条`
                        : `${this.allKnowledge.length} 条知识`;

                    await publishThink(this.context.taskId, `⚠️ LLM 未能生成有效的下一步动作。基于现有${knowledgeInfo}尝试生成答案。`);

                    const fallbackAnswer = await generateFinalAnswerHelper(this, {
                        currentQuestion,
                        isFinal: false,
                        beastMode: false
                    });

                    fallbackAnswer.isFinal = false;
                    fallbackAnswer.references = fallbackAnswer.references || [];
                    fallbackAnswer.think = `由于无法确定下一步，尝试基于现有知识生成答案（共 ${this.allKnowledge.length} 条知识可用）。${fallbackAnswer.think ? `\n${fallbackAnswer.think}` : ''}`;
                    this.thisStep = fallbackAnswer;
                } else {
                    await publishThink(this.context.taskId, `⚠️ LLM 未能生成有效的下一步动作，且知识不足（仅 ${this.allKnowledge.length} 条）。研究过程提前结束。`);
                    // 确保 thisStep 有值，即使 LLM 失败
                    this.thisStep = {
                        action: 'answer',
                        answer: '抱歉，由于技术原因无法完成研究。建议：1) 简化问题 2) 提供更具体的关键词 3) 稍后重试',
                        references: [],
                        think: 'LLM 失败且缺少足够知识',
                        isFinal: true
                    };
                    break;
                }
            } else {
                this.thisStep = nextAction;
            }

            const actionsStr = [this.allowSearch && 'search', this.allowRead && 'visit', this.allowAnswer && 'answer', this.allowReflect && 'reflect'].filter(Boolean).join(', ');
            console.log(`${currentQuestion}: ${this.thisStep.action} <- [${actionsStr}]`);
            console.log(this.thisStep)

            // 发送详细的思考过程到前端
            if (this.thisStep.think) {
                await publishThink(this.context.taskId, `💭 ${this.thisStep.think}`);
            }

            // 追踪执行的动作
            this.context.actionTracker.trackAction({ totalStep: this.totalStep, thisStep: this.thisStep, gaps: this.gaps });

            // 重置控制标志 (将在各自的 handler 中根据逻辑调整)
            this.allowAnswer = true;
            this.allowReflect = true;
            this.allowRead = true;
            this.allowSearch = true;

            // 执行确定的动作
            let breakLoop = false;
            switch (this.thisStep.action) {
                case 'answer':
                    breakLoop = await handleAnswerAction(this, this.thisStep as AnswerAction, currentQuestion);
                    break;
                case 'reflect':
                    await handleReflectAction(this, this.thisStep as ReflectAction, currentQuestion);
                    break;
                case 'search':
                    await handleSearchAction(this, this.thisStep as SearchAction, currentQuestion);
                    break;
                case 'visit':
                    await handleVisitAction(this, this.thisStep as VisitAction);
                    break;
                default:
                    console.warn("Unhandled action type:", (this.thisStep as any).action);
            }

            if (breakLoop) {
                break; // 如果某个动作处理器发出完成信号，则退出循环
            }

            await sleep(STEP_SLEEP); // 步骤之间的延迟
        }
    }

    /**
     * 运行 Agent 的主入口点
     * @returns 返回包含最终结果、上下文和 URL 列表的对象
     */
    public async run(): Promise<{ result: StepAction; context: TrackerContext; visitedURLs: string[], readURLs: string[], allURLs: string[] }> {
        console.log("Agent Run Started");

        // 执行主循环
        await this._runMainLoop();

        // 如果循环结束时没有得到最终答案，则生成最终答案 (可能使用 Beast Mode)
        if (!(this.thisStep as AnswerAction)?.isFinal) {
            this.thisStep = await generateFinalAnswerHelper(this);
        }

        // 确保 thisStep 被赋值
        if (!this.thisStep) {
            console.error("Loop finished without producing a final step action.");
            // 如果预算耗尽或其他原因导致没有 final step，提供一个错误答案
            this.thisStep = { action: 'answer', answer: 'Error: Could not determine final answer within budget.', references: [], think: 'Budget likely exceeded before final answer.', isFinal: true };
        }

        // 对最终答案进行后处理 (Markdown 修复、构建参考文献等)
        if (this.thisStep.action === 'answer') {
            await processFinalAnswerHelper(this, this.thisStep as AnswerAction);
        }

        console.log("Agent Run Finished");
        await publishThink(this.context.taskId, `✅ 深度思考结束！`);
        // 对最终的 URL 进行排序，并返回指定数量的 URL
        const finalWeightedURLs = await rankURLsHelper(this);
        const returnedURLs = finalWeightedURLs.slice(0, this.options.numReturnedURLs).map(r => r.url!);

        return {
            result: this.thisStep,
            context: this.context,
            visitedURLs: returnedURLs, // 返回经过排序和选择的 URL
            readURLs: this.visitedURLs.filter(url => !this.badURLs.includes(url)), // 实际成功读取的 URL
            allURLs: Object.keys(this.allURLs) // 所有遇到过的 URL
        };
    }
}
