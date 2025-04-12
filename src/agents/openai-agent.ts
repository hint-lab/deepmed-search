import OpenAI from "openai"
import { BaseAgent, AgentConfig, Message, AgentResponse, Tool } from "./base-agent"
import { z } from "zod"

// OpenAI 配置类型
export interface OpenAIConfig extends AgentConfig {
    baseUrl: string
    apiKey: string
    organization?: string
}

// 定义函数参数类型
interface FunctionParameters {
    [key: string]: any;
}

export class OpenAIAgent extends BaseAgent {
    private client: OpenAI
    private model: string

    constructor(config: OpenAIConfig) {
        super(config)
        if (!config.baseUrl || !config.apiKey) {
            throw new Error("OpenAI configuration is missing required parameters: baseUrl and apiKey")
        }
        this.client = new OpenAI({
            baseURL: config.baseUrl,
            apiKey: config.apiKey,
            organization: config.organization,
        })
        this.model = config.model || process.env.OPENAI_API_MODEL || "gpt-4o-mini"
        console.log("OpenAI Agent initialized with model:", this.model)
    }

    // 处理用户输入
    async process(input: string): Promise<AgentResponse> {
        // 添加用户消息
        this.addMessage({
            role: "user",
            content: input,
        })

        // 生成响应
        const response = await this.generateResponse(this.getMessages())

        // 添加助手消息
        this.addMessage({
            role: "assistant",
            content: response,
        })

        return {
            content: response,
            metadata: {
                model: this.model,
                timestamp: new Date().toISOString(),
            },
        }
    }

    // 处理工具调用
    async handleToolCall(toolName: string, params: any): Promise<any> {
        try {
            console.log(`Executing tool: ${toolName} with args:`, params)

            const tool = this.tools.find(t => t.name === toolName)
            if (!tool) {
                throw new Error(`Tool ${toolName} not found`)
            }

            const result = await tool.handler(params)
            console.log(`Tool ${toolName} execution result:`, result)
            return result
        } catch (error) {
            console.error("Tool execution error:", error)
            if (error instanceof Error) {
                return `Error executing tool: ${error.message}\nStack: ${error.stack}`
            }
            return `Error executing tool: ${String(error)}`
        }
    }

    // 生成响应
    async generateResponse(messages: Message[]): Promise<string> {
        try {
            const completion = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: "system",
                        content: this.getSystemPrompt(),
                    },
                    ...messages,
                ],
                temperature: this.config.temperature,
                max_tokens: this.config.maxTokens,
                stop: this.config.stop,
            })

            return completion.choices[0]?.message?.content || ""
        } catch (error) {
            console.error("Error generating response:", error)
            throw error
        }
    }

    // 使用函数调用
    async processWithFunctionCalling(input: string): Promise<AgentResponse> {
        // 添加用户消息
        this.addMessage({
            role: "user",
            content: input,
        })

        try {
            const completion = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: "system",
                        content: this.getSystemPrompt(),
                    },
                    ...this.getMessages(),
                ],
                functions: this.tools.map((tool) => ({
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters._def as unknown as FunctionParameters,
                })),
                function_call: "auto",
                temperature: this.config.temperature,
                max_tokens: this.config.maxTokens,
            })

            const message = completion.choices[0]?.message
            if (!message) {
                throw new Error("No response from OpenAI")
            }

            // 处理函数调用
            if (message.function_call) {
                const { name, arguments: args } = message.function_call
                const result = await this.handleToolCall(name, args)

                // 添加函数调用结果
                this.addMessage({
                    role: "assistant",
                    content: result,
                })

                // 生成最终响应
                const finalResponse = await this.generateResponse(this.getMessages())

                // 添加助手最终响应
                this.addMessage({
                    role: "assistant",
                    content: finalResponse,
                })

                return {
                    content: finalResponse,
                    metadata: {
                        model: this.model,
                        timestamp: new Date().toISOString(),
                        functionCall: {
                            name,
                            arguments: args,
                        },
                    },
                }
            }

            // 如果没有函数调用,直接返回响应
            this.addMessage({
                role: "assistant",
                content: message.content || "",
            })

            return {
                content: message.content || "",
                metadata: {
                    model: this.model,
                    timestamp: new Date().toISOString(),
                },
            }
        } catch (error) {
            console.error("Error processing with function calling:", error)
            throw error
        }
    }

    // 生成流式响应
    async generateStreamResponse(messages: Message[], onChunk: (chunk: string) => void): Promise<string> {
        try {
            const stream = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: "system",
                        content: this.getSystemPrompt(),
                    },
                    ...messages,
                ],
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
            return fullResponse;
        } catch (error) {
            console.error("Error generating stream response:", error);
            throw error;
        }
    }

    // 处理流式消息
    async processWithStream(input: string, onChunk: (chunk: string) => void): Promise<AgentResponse> {
        // 添加用户消息
        this.addMessage({
            role: "user",
            content: input,
        });

        // 生成流式响应
        const response = await this.generateStreamResponse(this.getMessages(), onChunk);

        // 添加助手消息
        this.addMessage({
            role: "assistant",
            content: response,
        });

        return {
            content: response,
            metadata: {
                model: this.model,
                timestamp: new Date().toISOString(),
            },
        };
    }
}