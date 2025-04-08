import { OpenAIAgent } from '@/agents/openai-agent';
import { DocumentAgent } from '@/agents/document-agent';
import { KnowledgeBase } from '@prisma/client';

type AgentType = 'chat' | 'document';

class AgentManager {
    private static instance: AgentManager;
    private agents: Map<string, OpenAIAgent | DocumentAgent> = new Map();
    private agentTypes: Map<string, AgentType> = new Map();

    private constructor() { }

    public static getInstance(): AgentManager {
        if (!AgentManager.instance) {
            AgentManager.instance = new AgentManager();
        }
        return AgentManager.instance;
    }

    public getChatAgent(dialogId: string, knowledgeBase?: KnowledgeBase | null): OpenAIAgent {
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
            this.agentTypes.set(dialogId, 'chat');
        }
        return this.agents.get(dialogId) as OpenAIAgent;
    }

    public getDocumentAgent(documentId: string): DocumentAgent {
        if (!this.agents.has(documentId)) {
            const agentConfig = {
                apiKey: process.env.OPENAI_API_KEY || "",
                zeroxApiKey: process.env.ZEROX_API_KEY || "",
                baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
                model: process.env.OPENAI_MODEL_NAME || "gpt-4o-mini",
                temperature: 0.7,
            };
            this.agents.set(documentId, new DocumentAgent(agentConfig));
            this.agentTypes.set(documentId, 'document');
        }
        return this.agents.get(documentId) as DocumentAgent;
    }

    public removeAgent(agentId: string): void {
        this.agents.delete(agentId);
        this.agentTypes.delete(agentId);
    }

    public clear(): void {
        this.agents.clear();
        this.agentTypes.clear();
    }

    public getAgentType(agentId: string): AgentType | undefined {
        return this.agentTypes.get(agentId);
    }

    public hasAgent(agentId: string): boolean {
        return this.agents.has(agentId);
    }
}

export const agentManager = AgentManager.getInstance(); 