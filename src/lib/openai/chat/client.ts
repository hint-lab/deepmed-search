import OpenAI from 'openai'
import {
    OpenAIConfig,
    Message,
    ChatResponse,
    Tool,
    ChunkHandler,
    FunctionParameters
} from '../types'
import { validateConfig } from '../config'
import { MessageHistory } from './history'

export class ChatClient {
    private static instance: ChatClient;
    private client: OpenAI;
    private config: OpenAIConfig;
    private historyMap: Map<string, MessageHistory>;
    private tools: Tool[] = [];
    private constructor() {
        this.config = validateConfig({
            apiKey: process.env.OPENAI_API_KEY || '',
            baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
            organization: process.env.OPENAI_ORGANIZATION,
            model: process.env.OPENAI_API_MODEL || 'gpt-4o-mini',
            temperature: 0.7,
            maxTokens: 2000,
            systemPrompt: '你是一个专业的AI助手。'
        });

        this.client = new OpenAI({
            baseURL: this.config.baseUrl,
            apiKey: this.config.apiKey,
            organization: this.config.organization,
        });

        this.historyMap = new Map();
    }

    public static getInstance(): ChatClient {
        if (!ChatClient.instance) {
            ChatClient.instance = new ChatClient();
        }
        return ChatClient.instance;
    }

    // 获取对话历史记录
    private getHistory(dialogId: string): MessageHistory {
        if (!this.historyMap.has(dialogId)) {
            this.historyMap.set(dialogId, new MessageHistory(this.config.systemPrompt));
        }
        return this.historyMap.get(dialogId)!;
    }

    // 设置系统提示词
    public setSystemPrompt(dialogId: string, prompt: string): void {
        const history = this.getHistory(dialogId);
        history.clear();
        history.addMessage({
            role: 'system',
            content: prompt,
        });
    }

    // 设置工具
    setTools(tools: Tool[]): void {
        this.tools = tools;
    }

    // 处理用户输入
    async chat(dialogId: string, input: string): Promise<ChatResponse> {
        const history = this.getHistory(dialogId);

        // 添加用户消息
        history.addMessage({
            role: 'user',
            content: input,
        });

        // 生成响应
        const response = await this.generateResponse(dialogId);

        // 添加助手消息
        history.addMessage({
            role: 'assistant',
            content: response.content,
        });

        return response;
    }

    // 处理工具调用
    private async handleToolCall(toolName: string, params: any): Promise<any> {
        try {
            console.log(`执行工具: ${toolName}，参数:`, params);

            const tool = this.tools.find(t => t.name === toolName);
            if (!tool) {
                throw new Error(`找不到工具: ${toolName}`);
            }

            const result = await tool.handler(params);
            console.log(`工具 ${toolName} 执行结果:`, result);
            return result;
        } catch (error) {
            console.error('工具执行错误:', error);
            if (error instanceof Error) {
                return `工具执行错误: ${error.message}\n堆栈: ${error.stack}`;
            }
            return `工具执行错误: ${String(error)}`;
        }
    }

    // 生成响应
    private async generateResponse(dialogId: string): Promise<ChatResponse> {
        try {
            const history = this.getHistory(dialogId);
            const completion = await this.client.chat.completions.create({
                model: this.config.model!,
                messages: history.getMessages() as any,
                temperature: this.config.temperature,
                max_tokens: this.config.maxTokens,
                stop: this.config.stop,
            });
            console.log("generateResponse completion", completion)
            return {
                content: completion.choices[0]?.message?.content || '',
                metadata: {
                    model: this.config.model!,
                    timestamp: new Date().toISOString(),
                }
            };
        } catch (error) {
            console.error('生成响应错误:', error);
            throw error;
        }
    }

    // 使用函数调用
    async chatWithFunctions(dialogId: string, input: string): Promise<ChatResponse> {
        const history = this.getHistory(dialogId);

        // 添加用户消息
        history.addMessage({
            role: 'user',
            content: input,
        });

        try {
            const completion = await this.client.chat.completions.create({
                model: this.config.model!,
                messages: history.getMessages() as any,
                functions: this.tools.map((tool) => ({
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters._def as unknown as FunctionParameters,
                })),
                function_call: 'auto',
                temperature: this.config.temperature,
                max_tokens: this.config.maxTokens,
            });
            console.log("completion", completion)
            const message = completion.choices[0]?.message;
            if (!message) {
                throw new Error('OpenAI 没有返回响应');
            }

            // 处理函数调用
            if (message.function_call) {
                const { name, arguments: args } = message.function_call;
                const result = await this.handleToolCall(name, args);

                // 添加函数调用结果
                history.addMessage({
                    role: 'assistant',
                    content: result,
                });

                // 生成最终响应
                return await this.generateResponse(dialogId);
            }

            // 如果没有函数调用，直接返回响应
            const response: ChatResponse = {
                content: message.content || '',
                metadata: {
                    model: this.config.model!,
                    timestamp: new Date().toISOString(),
                }
            };

            history.addMessage({
                role: 'assistant',
                content: response.content,
            });

            return response;
        } catch (error) {
            console.error('函数调用处理错误:', error);
            throw error;
        }
    }

    // 流式聊天
    async chatStream(dialogId: string, input: string, onChunk: ChunkHandler): Promise<ChatResponse> {
        const history = this.getHistory(dialogId);

        // 添加用户消息
        history.addMessage({
            role: 'user',
            content: input,
        });

        try {
            const stream = await this.client.chat.completions.create({
                model: this.config.model!,
                messages: history.getMessages() as any,
                temperature: this.config.temperature,
                max_tokens: this.config.maxTokens,
                stop: this.config.stop,
                stream: true,
            });

            let fullResponse = '';
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    fullResponse += content;
                    onChunk(content);
                }
            }

            const response: ChatResponse = {
                content: fullResponse,
                metadata: {
                    model: this.config.model!,
                    timestamp: new Date().toISOString(),
                }
            };

            // 添加助手消息
            history.addMessage({
                role: 'assistant',
                content: fullResponse,
            });

            return response;
        } catch (error) {
            console.error('流式响应生成错误:', error);
            throw error;
        }
    }

    // 清除历史记录
    clearHistory(dialogId: string): void {
        const history = this.getHistory(dialogId);
        history.clear();
        if (this.config.systemPrompt) {
            history.addMessage({
                role: 'system',
                content: this.config.systemPrompt,
            });
        }
    }
}

// 导出单例实例
export const chatClient = ChatClient.getInstance(); 