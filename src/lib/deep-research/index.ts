import { CoreMessage } from 'ai';
import { ResearchAgent, ResearchAgentOptions } from './agent'; // Assuming ResearchAgent is exported from agent.ts
import { StepAction, TrackerContext } from './types'; // Assuming types are in types.ts 
import { publishThink, publishComplete, publishResult } from './tracker-store';
import { userContextStorage, UserResearchContext } from './user-context';

export async function processResearchTask(
    taskId: string,
    userId: string, // 用户ID（必需：用于获取用户配置的API keys）
    questionFromParam?: string,
    tokenBudget: number = 1_000_000,
    maxBadAttempts: number = 2,
    existingContext?: Partial<TrackerContext>,
    initialMessages?: Array<CoreMessage>,
    numReturnedURLs: number = 100,
    noDirectAnswer: boolean = false,
    boostHostnames: string[] = [],
    badHostnames: string[] = [],
    onlyHostnames: string[] = [],
    maxRef: number = 10,
    minRelScore: number = 0.75
): Promise<{ result: StepAction; context: TrackerContext; visitedURLs: string[], readURLs: string[], allURLs: string[] }> {

    let question: string = '';
    let messages: CoreMessage[];

    // Determine question and messages
    if (initialMessages && initialMessages.length > 0) {
        messages = initialMessages;
        const userMessage = messages.find(m => m.role === 'user');
        const userMessageContent = typeof userMessage?.content === 'string' ? userMessage.content : ''; // Get content safely

        question = questionFromParam?.trim() || userMessageContent.trim() || '';

        if (!question) {
            const lastMessage = messages[messages.length - 1];
            const lastMessageContentStr = typeof lastMessage?.content === 'string' ? lastMessage.content : ''; // Get content safely
            const lastMessageTrimmed = lastMessageContentStr.trim();

            if (lastMessageTrimmed) {
                console.warn("Question not explicitly provided, using content of the last message.");
                question = lastMessageTrimmed;
            } else {
                throw new Error("Cannot determine the question from the provided messages.");
            }
        }
    } else if (questionFromParam) {
        question = questionFromParam.trim();
        messages = [{ role: 'user', content: question }];
    } else {
        throw new Error("Provide either initialMessages or questionFromParam.");
    }

    // 从数据库加载用户配置（只查询一次）
    let userContext: UserResearchContext;
    try {
        const { decryptApiKey } = await import('@/lib/crypto');
        const { getSearchConfig } = await import('@/lib/search/config');
        const { PrismaClient } = await import('@prisma/client');

        const prisma = new PrismaClient();

        // 直接从数据库获取用户的 LLM 配置
        const llmConfigDb = await prisma.lLMConfig.findFirst({
            where: {
                userId: userId,
                isActive: true,
            },
        });

        if (!llmConfigDb) {
            throw new Error('未找到激活的 LLM 配置。请访问 /settings/llm 页面配置您的 API Key');
        }

        // 解密 API Key
        const decryptedApiKey = decryptApiKey(llmConfigDb.apiKey);

        // 获取搜索配置
        const searchConfig = await getSearchConfig(userId);

        // 构建用户上下文（将在整个任务执行期间保持隔离）
        userContext = {
            userId,
            llmConfig: {
                type: llmConfigDb.provider as 'deepseek' | 'openai' | 'google',
                apiKey: decryptedApiKey,
                baseUrl: llmConfigDb.baseUrl || undefined,
                model: llmConfigDb.model || undefined,
            },
            searchConfig: {
                searchProvider: searchConfig.searchProvider,
                jinaApiKey: searchConfig.jinaApiKey,
                tavilyApiKey: searchConfig.tavilyApiKey,
                ncbiApiKey: searchConfig.ncbiApiKey,
            }
        };

        console.log(`[Task ${taskId}] 已为用户 ${userId} 加载配置: LLM=${llmConfigDb.provider}, Search=${searchConfig.searchProvider}`);
    } catch (error) {
        console.error(`[Task ${taskId}] 获取用户配置失败:`, error);
        throw new Error(`无法获取用户配置的 API keys: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 使用 AsyncLocalStorage 在隔离的上下文中运行整个研究任务
    // 这确保了并发任务之间的用户配置不会相互干扰
    return await userContextStorage.run(userContext, async () => {
        // 发布开始思考的消息
        await publishThink(taskId, `开始研究问题: ${question}`);

        // Prepare options for the agent
        // Combine existingContext with the taskId
        const contextWithTaskId: Partial<TrackerContext> = {
            ...existingContext, // Spread existing context first
            taskId: taskId      // Ensure taskId is included
        };

        const agentOptions: ResearchAgentOptions = {
            userId, // 传递用户ID
            question,
            messages,
            tokenBudget,
            maxBadAttempts,
            existingContext: contextWithTaskId, // Pass the combined context
            numReturnedURLs,
            noDirectAnswer,
            boostHostnames,
            badHostnames,
            onlyHostnames,
            maxRef,
            minRelScore
        };

        // Instantiate and run the agent
        const agent = new ResearchAgent(agentOptions);
        const result = await agent.run();
        await publishThink(taskId, `研究完成: ${question}`);

        // 发布研究结果
        await publishResult(taskId, result);

        // 发布完成消息
        await publishComplete(taskId, `研究完成: ${question}`);

        return result;
    });
}
