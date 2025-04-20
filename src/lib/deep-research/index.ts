import { CoreMessage } from 'ai';
import { ResearchAgent, ResearchAgentOptions } from './agent'; // Assuming ResearchAgent is exported from agent.ts
import { StepAction, TrackerContext } from './types'; // Assuming types are in types.ts 
import { publishThink, publishComplete, publishResult } from './tracker-store';

export async function processResearchTask(
    taskId: string,
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

    // 发布开始思考的消息
    await publishThink(taskId, `开始研究问题: ${question}`);

    // Prepare options for the agent
    // Combine existingContext with the taskId
    const contextWithTaskId: Partial<TrackerContext> = {
        ...existingContext, // Spread existing context first
        taskId: taskId      // Ensure taskId is included
    };

    const agentOptions: ResearchAgentOptions = {
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
}
