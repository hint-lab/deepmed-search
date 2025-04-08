import { z } from "zod"
// 定义基础消息类型
export interface Message {
    role: "user" | "assistant" | "system"
    content: string
    name?: string
}

// 定义基础响应类型
export interface AgentResponse {
    content: string
    metadata?: Record<string, any>
}

// 定义基础配置类型
export interface AgentConfig {
    model?: string
    temperature?: number
    maxTokens?: number
    stop?: string[]
    systemPrompt?: string
}

// 定义基础工具类型
export interface Tool {
    name: string
    description: string
    parameters: z.ZodType<any>
    handler: (params: any) => Promise<any>
}

export abstract class BaseAgent {
    protected config: AgentConfig
    protected tools: Tool[]
    protected messages: Message[]
    protected systemPrompt: string

    constructor(config: AgentConfig = {}) {
        this.config = {
            model: "gpt-3.5-turbo",
            temperature: 0.7,
            maxTokens: 1000,
            ...config,
        }
        this.tools = []
        this.messages = []
        this.systemPrompt = config.systemPrompt || "你是一个有帮助的AI助手。"
    }

    // 添加工具
    addTool(tool: Tool) {
        this.tools.push(tool)
    }

    // 添加消息
    addMessage(message: Message) {
        this.messages.push(message)
    }

    // 清空消息历史
    clearMessages() {
        this.messages = []
    }

    // 获取消息历史
    getMessages(): Message[] {
        return this.messages
    }

    // 获取系统提示词
    getSystemPrompt(): string {
        return this.systemPrompt
    }

    // 设置系统提示词
    setSystemPrompt(prompt: string) {
        this.systemPrompt = prompt
    }

    // 抽象方法:处理用户输入
    abstract process(input: string): Promise<AgentResponse>

    // 抽象方法:处理工具调用
    abstract handleToolCall(toolName: string, params: any): Promise<any>

    // 抽象方法:生成响应
    abstract generateResponse(messages: Message[]): Promise<string>
}