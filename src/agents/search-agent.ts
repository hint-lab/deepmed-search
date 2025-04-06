import { OpenAIAgent, OpenAIConfig } from "./openai-agent"
import { Tool } from "./base-agent"
import { z } from "zod"

// 搜索配置类型
interface SearchAgentConfig extends OpenAIConfig {
    searchApiKey?: string
    searchEngineId?: string
}

// 文档搜索工具
const documentSearchTool: Tool = {
    name: "search_documents",
    description: "在知识库中搜索相关文档",
    parameters: z.object({
        query: z.string().describe("搜索关键词"),
        kbIds: z.array(z.string()).describe("知识库ID列表"),
        limit: z.number().optional().describe("返回结果数量限制"),
    }),
    handler: async ({ query, kbIds, limit = 5 }) => {
        // 这里应该调用实际的文档搜索 API
        return {
            query,
            kbIds,
            results: [
                {
                    id: "doc1",
                    title: "相关文档 1",
                    content: "文档内容...",
                    relevance: 0.95,
                },
                {
                    id: "doc2",
                    title: "相关文档 2",
                    content: "文档内容...",
                    relevance: 0.85,
                },
            ].slice(0, limit),
        }
    },
}

// 思维导图生成工具
const mindMapTool: Tool = {
    name: "generate_mindmap",
    description: "根据内容生成思维导图",
    parameters: z.object({
        content: z.string().describe("要生成思维导图的内容"),
        format: z.enum(["json", "markdown"]).optional().describe("输出格式"),
    }),
    handler: async ({ content, format = "json" }) => {
        // 这里应该调用实际的思维导图生成 API
        return {
            content,
            format,
            mindmap: {
                root: {
                    text: "主题",
                    children: [
                        {
                            text: "子主题 1",
                            children: [
                                { text: "细节 1" },
                                { text: "细节 2" },
                            ],
                        },
                    ],
                },
            },
        }
    },
}

export class SearchAgent extends OpenAIAgent {
    constructor(config: SearchAgentConfig) {
        super(config)

        // 添加搜索相关工具
        this.addTool(documentSearchTool)
        this.addTool(mindMapTool)

        // 设置专门的系统提示词
        this.setSystemPrompt(
            `你是一个专业的搜索助手,可以帮助用户:
                1. 在知识库中搜索相关文档
                2. 生成思维导图
                3. 回答用户的问题

                请使用提供的工具来完成任务,并给出清晰、准确的回答。`
        )
    }

    // 重写处理方法,添加搜索特定的逻辑
    async process(input: string): Promise<AgentResponse> {
        // 首先尝试使用函数调用
        try {
            return await this.processWithFunctionCalling(input)
        } catch (error) {
            console.warn("Function calling failed, falling back to basic processing:", error)
            // 如果函数调用失败,回退到基本处理
            return super.process(input)
        }
    }

    // 添加专门的搜索方法
    async searchDocuments(query: string, kbIds: string[], limit: number = 5) {
        return await this.handleToolCall("search_documents", {
            query,
            kbIds,
            limit,
        })
    }

    // 添加思维导图生成方法
    async generateMindMap(content: string, format: "json" | "markdown" = "json") {
        return await this.handleToolCall("generate_mindmap", {
            content,
            format,
        })
    }
}

// 示例:如何使用搜索 Agent
export async function searchAgentExample() {
    const agent = new SearchAgent({
        apiKey: process.env.OPENAI_API_KEY || "",
        model: "gpt-3.5-turbo",
        temperature: 0.7,
    })

    try {
        // 搜索文档
        const searchResponse = await agent.searchDocuments(
            "人工智能发展历史",
            ["kb1", "kb2"],
            3
        )
        console.log("Search Results:", searchResponse)

        // 生成思维导图
        const mindMapResponse = await agent.generateMindMap(
            "人工智能的主要应用领域",
            "json"
        )
        console.log("Mind Map:", mindMapResponse)

        // 处理用户问题
        const response = await agent.process(
            "请帮我总结一下人工智能的发展历史,并生成一个思维导图。"
        )
        console.log("Agent Response:", response)
    } catch (error) {
        console.error("Error:", error)
    }
} 