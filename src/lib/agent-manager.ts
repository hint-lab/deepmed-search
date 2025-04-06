import { OpenAIAgent } from '@/agents/openai-agent';
import { KnowledgeBase } from '@prisma/client';

class AgentManager {
    private static instance: AgentManager;
    private agents: Map<string, OpenAIAgent> = new Map();

    private constructor() { }

    public static getInstance(): AgentManager {
        if (!AgentManager.instance) {
            AgentManager.instance = new AgentManager();
        }
        return AgentManager.instance;
    }

    public getAgent(dialogId: string, knowledgeBase?: KnowledgeBase | null): OpenAIAgent {
        if (!this.agents.has(dialogId)) {
            const agentConfig = {
                baseUrl: process.env.OPENAI_BASE_URL || '',
                apiKey: process.env.OPENAI_API_KEY || '',
                model: process.env.OPENAI_MODEL_NAME || '',
                temperature: 0.7,
                maxTokens: 2000,
                knowledgeBase
            };
            this.agents.set(dialogId, new OpenAIAgent(agentConfig));
        }
        return this.agents.get(dialogId)!;
    }

    public removeAgent(dialogId: string): void {
        this.agents.delete(dialogId);
    }

    public clear(): void {
        this.agents.clear();
    }
}

export const agentManager = AgentManager.getInstance(); 