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
import logger from '@/utils/logger'
import { MessageType } from '@/constants/chat'

// 将自定义消息类型转换为 OpenAI API 支持的标准角色
function convertToStandardRole(role: string): 'system' | 'user' | 'assistant' | 'function' {
    switch (role) {
        case 'reason':
        case MessageType.Reason:
            return 'user';
        case 'reasonReply':
        case MessageType.ReasonReply:
            return 'assistant';
        case 'user':
        case MessageType.User:
            return 'user';
        case 'assistant':
        case MessageType.Assistant:
            return 'assistant';
        case 'system':
            return 'system';
        case 'function':
            return 'function';
        default:
            return 'user';
    }
}

// 将消息列表转换为 API 标准格式
function convertMessagesToApiFormat(messages: any[]): any[] {
    return messages.map(msg => ({
        ...msg,
        role: convertToStandardRole(msg.role)
    }));
}

export class ChatClient {
    private static instance: ChatClient;
    private client: OpenAI;
    private config: OpenAIConfig;
    private historyMap: Map<string, MessageHistory>;
    private tools: Tool[] = [];
    private reasonModel: string;
    private constructor() {
        this.config = validateConfig({
            apiKey: process.env.OPENAI_API_KEY || '',
            baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
            organization: process.env.OPENAI_ORGANIZATION,
            model: process.env.OPENAI_API_MODEL || 'gpt-4o-mini',
            temperature: 0.7,
            maxTokens: 2000,
            systemPrompt: '你是DeepMed团队开发的一个专业的医学AI助手'
        });

        // 设置思考模式专用模型
        this.reasonModel = process.env.OPENAI_API_REASON_MODEL || 'o4-mini';
        logger.info('思考模式使用模型:', this.reasonModel);

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

    // 过滤历史记录中的思考消息，保留系统消息和思考消息
    private filterReasonMessages(messages: any[]): any[] {
        return messages.filter(msg =>
            msg.role === 'system' ||
            msg.role === MessageType.Reason ||
            msg.role === 'reason'
        );
    }

    // 过滤历史记录中的思考消息，不发送思考相关消息给模型
    private filterNonReasonMessages(messages: any[]): any[] {
        return messages.filter(msg =>
            msg.role !== MessageType.Reason &&
            msg.role !== MessageType.ReasonReply &&
            msg.role !== 'reason' &&
            msg.role !== 'reasonReply'
        );
    }

    // 处理用户输入
    async chat(dialogId: string, input: string, isReason: boolean = false): Promise<ChatResponse> {
        const history = this.getHistory(dialogId);

        // 添加用户消息
        if (isReason) {
            // 思考消息使用特殊模型
            history.addMessage({
                role: MessageType.Reason,
                content: input,
            } as any);

            try {
                // 过滤历史记录，只获取思考相关的消息
                const reasonMessages = this.filterReasonMessages(history.getMessages());

                // 转换为 API 支持的格式
                const apiMessages = convertMessagesToApiFormat(reasonMessages);

                // 使用思考专用模型生成响应
                const completion = await this.client.chat.completions.create({
                    model: this.reasonModel,
                    messages: apiMessages,
                    temperature: this.config.temperature,
                    reasoning_effort: "medium",
                    max_completion_tokens: this.config.maxTokens,
                });

                const response = {
                    content: completion.choices[0]?.message?.content || '',
                    metadata: {
                        model: this.reasonModel,
                        timestamp: new Date().toISOString(),
                        isReason: true
                    }
                };

                // 添加思考结果到历史
                history.addMessage({
                    role: MessageType.ReasonReply,
                    content: response.content,
                } as any);

                return response;
            } catch (error) {
                logger.error('思考模式生成响应错误:', error);
                return {
                    content: '',
                    metadata: {
                        model: this.reasonModel,
                        timestamp: new Date().toISOString(),
                        isReason: true
                    }
                };
            }
        } else {
            // 普通消息正常处理
            history.addMessage({
                role: MessageType.User,
                content: input,
            } as any);

            // 生成响应
            const response = await this.generateResponse(dialogId);

            // 添加助手消息
            history.addMessage({
                role: MessageType.Assistant,
                content: response.content,
            } as any);

            return response;
        }
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
            logger.log(`工具 ${toolName} 执行结果:`, result);
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

            // 过滤历史记录中的思考消息，不发送给模型
            const messagesForModel = this.filterNonReasonMessages(history.getMessages());

            // 转换为 API 支持的格式
            const apiMessages = convertMessagesToApiFormat(messagesForModel);

            const completion = await this.client.chat.completions.create({
                model: this.config.model!,
                messages: apiMessages,
                temperature: this.config.temperature,
                max_completion_tokens: this.config.maxTokens,
                stop: this.config.stop,
            });
            logger.info("generateResponse completion", completion)
            return {
                content: completion.choices[0]?.message?.content || '',
                metadata: {
                    model: this.config.model!,
                    timestamp: new Date().toISOString(),
                }
            };
        } catch (error) {
            logger.error('生成响应错误:', error);
            throw error;
        }
    }

    // 使用函数调用
    async chatWithFunctions(dialogId: string, input: string, isReason: boolean = false): Promise<ChatResponse> {
        const history = this.getHistory(dialogId);

        // 添加用户消息
        if (isReason) {
            // 思考消息使用特殊格式，使用思考模式专用模型
            history.addMessage({
                role: MessageType.Reason,
                content: input,
            } as any);

            try {
                // 过滤历史记录，只获取思考相关的消息
                const reasonMessages = this.filterReasonMessages(history.getMessages());

                // 转换为 API 支持的格式
                const apiMessages = convertMessagesToApiFormat(reasonMessages);

                // 使用思考专用模型生成响应
                const completion = await this.client.chat.completions.create({
                    model: this.reasonModel,
                    messages: apiMessages,
                    functions: this.tools.map((tool) => ({
                        name: tool.name,
                        description: tool.description,
                        parameters: tool.parameters._def as unknown as FunctionParameters,
                    })),
                    function_call: 'auto',
                    temperature: this.config.temperature,
                    max_completion_tokens: this.config.maxTokens,
                });

                const message = completion.choices[0]?.message;

                // 处理函数调用
                if (message?.function_call) {
                    const { name, arguments: args } = message.function_call;
                    const result = await this.handleToolCall(name, args);

                    // 添加函数调用结果
                    history.addMessage({
                        role: MessageType.ReasonReply,
                        content: result,
                    } as any);

                    return {
                        content: result,
                        metadata: {
                            model: this.reasonModel,
                            timestamp: new Date().toISOString(),
                            isReason: true
                        }
                    };
                } else {
                    // 添加思考结果到历史
                    history.addMessage({
                        role: MessageType.ReasonReply,
                        content: message?.content || '',
                    } as any);

                    return {
                        content: message?.content || '',
                        metadata: {
                            model: this.reasonModel,
                            timestamp: new Date().toISOString(),
                            isReason: true
                        }
                    };
                }
            } catch (error) {
                logger.error('思考模式函数调用错误:', error);
                return {
                    content: '',
                    metadata: {
                        model: this.reasonModel,
                        timestamp: new Date().toISOString(),
                        isReason: true
                    }
                };
            }
        }

        history.addMessage({
            role: MessageType.User,
            content: input,
        } as any);

        try {
            // 过滤历史记录中的思考消息，不发送给模型
            const messagesForModel = this.filterNonReasonMessages(history.getMessages());

            // 转换为 API 支持的格式
            const apiMessages = convertMessagesToApiFormat(messagesForModel);

            const completion = await this.client.chat.completions.create({
                model: this.config.model!,
                messages: apiMessages,
                functions: this.tools.map((tool) => ({
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters._def as unknown as FunctionParameters,
                })),
                function_call: 'auto',
                temperature: this.config.temperature,
                max_completion_tokens: this.config.maxTokens,
            });
            logger.info("completion", completion)
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
                    role: MessageType.ReasonReply,
                    content: result,
                } as any);

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
                role: MessageType.Assistant,
                content: response.content,
            } as any);

            return response;
        } catch (error) {
            logger.error('函数调用处理错误:', error);
            throw error;
        }
    }

    // 流式聊天
    async chatStream(dialogId: string, input: string, onChunk: ChunkHandler, isReason: boolean = false): Promise<ChatResponse> {
        const history = this.getHistory(dialogId);

        // 添加用户消息
        if (isReason) {
            // 思考消息使用特殊模型
            history.addMessage({
                role: MessageType.Reason,
                content: input,
            } as any);

            try {
                // 过滤历史记录，只获取思考相关的消息
                const reasonMessages = this.filterReasonMessages(history.getMessages());

                // 转换为 API 支持的格式
                const apiMessages = convertMessagesToApiFormat(reasonMessages);

                // 使用思考专用模型生成流式响应
                const stream = await this.client.chat.completions.create({
                    model: this.reasonModel,
                    messages: apiMessages,
                    temperature: 1,
                    max_completion_tokens: this.config.maxTokens,
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

                // 添加思考结果到历史
                history.addMessage({
                    role: MessageType.ReasonReply,
                    content: fullResponse,
                } as any);

                return {
                    content: fullResponse,
                    metadata: {
                        model: this.reasonModel,
                        timestamp: new Date().toISOString(),
                        isReason: true
                    }
                };
            } catch (error) {
                logger.error('思考模式流式响应错误:', error);
                return {
                    content: '',
                    metadata: {
                        model: this.reasonModel,
                        timestamp: new Date().toISOString(),
                        isReason: true
                    }
                };
            }
        }

        history.addMessage({
            role: MessageType.User,
            content: input,
        } as any);

        try {
            // 过滤历史记录中的思考消息，不发送给模型
            const messagesForModel = this.filterNonReasonMessages(history.getMessages());

            // 转换为 API 支持的格式
            const apiMessages = convertMessagesToApiFormat(messagesForModel);

            const stream = await this.client.chat.completions.create({
                model: this.config.model!,
                messages: apiMessages,
                temperature: this.config.temperature,
                max_completion_tokens: this.config.maxTokens,
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
                role: MessageType.Assistant,
                content: fullResponse,
            } as any);

            return response;
        } catch (error) {
            logger.error('流式响应生成错误:', error);
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

    // 获取对话历史
    getConversationHistory(dialogId: string): Message[] {
        const history = this.getHistory(dialogId);
        return history.getMessages();
    }
}

// 导出单例实例
export const chatClient = ChatClient.getInstance(); 