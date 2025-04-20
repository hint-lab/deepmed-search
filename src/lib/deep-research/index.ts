import { CoreMessage } from 'ai';
import { ResearchAgent, ResearchAgentOptions } from './agent'; // Assuming ResearchAgent is exported from agent.ts
import { StepAction, TrackerContext } from './types'; // Assuming types are in types.ts 



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

    // Prepare options for the agent
    const agentOptions: ResearchAgentOptions = {
        question,
        messages,
        tokenBudget,
        maxBadAttempts,
        existingContext,
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
    return agent.run();
}
