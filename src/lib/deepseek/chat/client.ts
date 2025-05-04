import OpenAI from 'openai'
import {
    DeepSeekConfig,
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
    private config: DeepSeekConfig;
    private historyMap: Map<string, MessageHistory>;
    private tools: Tool[] = [];
    private reasonModel: string;
    private constructor() {
        this.config = validateConfig({
            apiKey: process.env.DEEPSEEK_API_KEY || '',
            baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
            organization: process.env.DEEPSEEK_ORGANIZATION,
            model: process.env.DEEPSEEK_API_MODEL || 'deepseek-chat',
            temperature: 0.7,
            maxTokens: 2000,
            systemPrompt: '你是一个专业的AI助手。'
        });

        // 设置思考模式专用模型
        this.reasonModel = process.env.DEEPSEEK_API_REASON_MODEL || 'deepseek-reasoner';
        logger.info('Thinking mode model:', this.reasonModel);

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
        // 首先过滤出系统消息和思考相关消息
        const filteredMessages = messages.filter(msg =>
            msg.role === 'system' ||
            msg.role === MessageType.Reason ||
            msg.role === 'reason'
        );

        // 确保消息序列中用户和助手的消息交替出现
        const result: any[] = [];
        let lastRole: string | null = null;

        for (const msg of filteredMessages) {
            const currentRole = convertToStandardRole(msg.role);

            // 如果是系统消息，直接添加
            if (currentRole === 'system') {
                result.push(msg);
                continue;
            }

            // 如果是用户消息，且上一条不是用户消息，则添加
            if (currentRole === 'user' && lastRole !== 'user') {
                result.push(msg);
                lastRole = 'user';
                continue;
            }

            // 如果是助手消息，且上一条是用户消息，则添加
            if (currentRole === 'assistant' && lastRole === 'user') {
                result.push(msg);
                lastRole = 'assistant';
                continue;
            }
        }

        // 如果最后一条消息不是用户消息，则移除最后一条消息
        if (result.length > 0 && convertToStandardRole(result[result.length - 1].role) !== 'user') {
            result.pop();
        }

        return result;
    }

    // 多轮对话时，确保不发送前一轮的reasoning_content
    private removeReasoningContent(messages: any[]): any[] {
        return messages.map(msg => {
            // 确保从API响应中删除reasoning_content字段
            if (msg.reasoning_content) {
                const { reasoning_content, ...restMsg } = msg;
                return restMsg;
            }
            return msg;
        });
    }

    // 过滤历史记录中的思考消息，不发送思考相关消息给模型
    private filterNonReasonMessages(messages: any[]): any[] {
        // 先过滤消息类型
        const filteredMessages = messages.filter(msg =>
            msg.role !== MessageType.Reason &&
            msg.role !== MessageType.ReasonReply &&
            msg.role !== 'reason' &&
            msg.role !== 'reasonReply'
        );

        // 然后移除reasoning_content字段
        return this.removeReasoningContent(filteredMessages);
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

                // 使用思考专用模型生成响应 - 根据文档DeepSeek推理模型不支持temperature等参数
                const completion = await this.client.chat.completions.create({
                    model: this.reasonModel,
                    messages: apiMessages,
                });

                // 获取思维链内容和最终答案
                const message = completion.choices[0]?.message as any;
                const reasoningContent = message?.reasoning_content || '';
                const content = message?.content || '';

                const response = {
                    content: content,
                    metadata: {
                        model: this.reasonModel,
                        timestamp: new Date().toISOString(),
                        isReason: true,
                        reasoningContent: reasoningContent
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
                max_tokens: this.config.maxTokens,
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

                // 检查消息序列是否有效
                if (reasonMessages.length === 0) {
                    throw new Error('没有有效的消息序列');
                }

                // 确保最后一条消息是用户消息
                const lastMessage = reasonMessages[reasonMessages.length - 1];
                if (convertToStandardRole(lastMessage.role) !== 'user') {
                    throw new Error('最后一条消息必须是用户消息');
                }

                // 转换为 API 支持的格式
                const apiMessages = convertMessagesToApiFormat(reasonMessages);

                // 使用思考专用模型生成流式响应
                const stream = await this.client.chat.completions.create({
                    model: this.reasonModel,
                    messages: apiMessages,
                    stream: true,
                });

                let reasoningContent = '';
                let finalContent = '';
                let currentlyProcessingReasoning = true;

                for await (const chunk of stream) {
                    const delta = chunk.choices[0]?.delta as any;

                    if (delta?.reasoning_content) {
                        reasoningContent += delta.reasoning_content;
                        onChunk(`[REASONING]${delta.reasoning_content}`);
                    } else if (delta?.content) {
                        if (currentlyProcessingReasoning) {
                            currentlyProcessingReasoning = false;
                            onChunk(`[END_REASONING][CONTENT]`);
                        }
                        finalContent += delta.content;
                        onChunk(delta.content);
                    }
                }

                // 构建响应对象
                const response: ChatResponse = {
                    content: finalContent,
                    metadata: {
                        model: this.reasonModel,
                        timestamp: new Date().toISOString(),
                        isReason: true,
                        reasoningContent: reasoningContent
                    }
                };

                // 只有当有内容时才添加到历史记录
                if (finalContent || reasoningContent) {
                    history.addMessage({
                        role: MessageType.ReasonReply,
                        content: finalContent,
                        metadata: {
                            reasoningContent: reasoningContent
                        }
                    } as any);
                }

                return response;
            } catch (error) {
                logger.error('思考模式流式响应错误:', error);
                throw error; // 让上层处理错误
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
                stream: true,
            });

            let reasoningContent = '';
            let finalContent = '';

            for await (const chunk of stream) {
                // 处理思维链内容
                const delta = chunk.choices[0]?.delta as any;
                if (delta?.reasoning_content) {
                    reasoningContent += delta.reasoning_content;
                    // 将思维链内容传给处理函数
                    onChunk(delta.reasoning_content);
                }
                // 处理最终回答内容
                else if (delta?.content) {
                    finalContent += delta.content;
                    onChunk(delta.content);
                }
            }

            // 合并思维链和最终回答
            const fullResponse = finalContent || reasoningContent;

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