import { OpenAIAgent, OpenAIConfig } from "./openai-agent"
import { Tool } from "./base-agent"
import { z } from "zod"
import { zerox } from "zerox"
import { ModelOptions, ModelProvider, ZeroxOutput, Page as ZeroxPage } from "zerox/node-zerox/dist/types"

// 定义页面类型
interface Page {
    page: number
    content: string
    contentLength: number
}

// 文档解析配置类型
interface DocumentAgentConfig extends OpenAIConfig {
    zeroxApiKey?: string
    zeroxEndpoint?: string
    baseUrl: string
}

// 文档解析工具
const documentParseTool: Tool = {
    name: "parse_document",
    description: "使用 ZeroX 解析文档内容",
    parameters: z.object({
        filePath: z.string().describe("文档文件路径或URL"),
        model: z.string().optional().describe("使用的模型名称"),
        outputDir: z.string().optional().describe("输出目录"),
        maintainFormat: z.boolean().optional().describe("是否保持格式"),
        cleanup: z.boolean().optional().describe("是否清理临时文件"),
        concurrency: z.number().optional().describe("并发处理数量"),
    }),
    handler: async ({ filePath, model = ModelOptions.OPENAI_GPT_4O, outputDir, maintainFormat = false, cleanup = true, concurrency = 10 }) => {
        const result = await zerox({
            filePath,
            modelProvider: ModelProvider.OPENAI,
            model,
            credentials: {
                apiKey: process.env.OPENAI_API_KEY || "",
            },
            outputDir,
            maintainFormat,
            cleanup,
            concurrency,
        }) as ZeroxOutput

        return {
            content: result.pages.map(page => page.content || "").join("\n"),
            metadata: {
                completionTime: result.completionTime,
                fileName: result.fileName,
                inputTokens: result.inputTokens,
                outputTokens: result.outputTokens,
                pages: result.pages.map((page: ZeroxPage) => ({
                    pageNumber: page.page,
                    content: page.content || "",
                    contentLength: page.contentLength || 0,
                })),
            },
        }
    },
}

// 文档摘要工具
const documentSummaryTool: Tool = {
    name: "summarize_document",
    description: "生成文档摘要",
    parameters: z.object({
        filePath: z.string().describe("文档文件路径或URL"),
        model: z.string().optional().describe("使用的模型名称"),
        maxLength: z.number().optional().describe("摘要最大长度"),
        format: z.enum(["bullet", "paragraph"]).optional().describe("摘要格式"),
    }),
    handler: async ({ filePath, model = ModelOptions.OPENAI_GPT_4O, maxLength = 500, format = "paragraph" }) => {
        const result = await zerox({
            filePath,
            modelProvider: ModelProvider.OPENAI,
            model,
            credentials: {
                apiKey: process.env.OPENAI_API_KEY || "",
            },
            prompt: `请生成一个${format === "bullet" ? "要点列表" : "段落"}形式的文档摘要，长度不超过${maxLength}字。`,
        }) as ZeroxOutput

        return {
            summary: result.pages.map(page => page.content || "").join("\n"),
            metadata: {
                completionTime: result.completionTime,
                inputTokens: result.inputTokens,
                outputTokens: result.outputTokens,
            },
            format,
        }
    },
}

export class DocumentAgent extends OpenAIAgent {
    private zeroxApiKey: string
    private zeroxEndpoint: string
    private baseUrl: string

    constructor(config: DocumentAgentConfig) {
        super(config)
        this.zeroxApiKey = config.zeroxApiKey || process.env.ZEROX_API_KEY || ""
        this.zeroxEndpoint = config.zeroxEndpoint || process.env.ZEROX_ENDPOINT || ""
        this.baseUrl = config.baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"

        // 添加文档处理相关工具
        this.addTool(documentParseTool)
        this.addTool(documentSummaryTool)

        // 设置专门的系统提示词
        this.setSystemPrompt(
            `你是一个专业的文档处理助手,可以帮助用户:
                1. 解析各种格式的文档（支持 PDF、DOC、DOCX、TXT、HTML、XML 等）
                2. 生成文档摘要
                3. 提取文档中的关键信息
                4. 回答关于文档内容的问题

                请使用提供的工具来完成任务,并给出清晰、准确的回答。`
        )
    }

    // 解析文档
    async parseDocument(filePath: string, options?: {
        model?: string
        outputDir?: string
        maintainFormat?: boolean
        cleanup?: boolean
        concurrency?: number
    }) {
        return await this.handleToolCall("parse_document", {
            filePath,
            ...options,
        })
    }

    // 生成文档摘要
    async summarizeDocument(filePath: string, options?: {
        model?: string
        maxLength?: number
        format?: "bullet" | "paragraph"
    }) {
        return await this.handleToolCall("summarize_document", {
            filePath,
            ...options,
        })
    }
}

// 示例:如何使用文档处理 Agent
export async function documentAgentExample() {
    const agent = new DocumentAgent({
        apiKey: process.env.OPENAI_API_KEY || "",
        zeroxApiKey: process.env.ZEROX_API_KEY || "",
        baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
        model: process.env.OPENAI_MODEL_NAME || "gpt-4o-mini",
        temperature: 0.7,
    })

    try {
        // 解析文档
        const parseResponse = await agent.parseDocument(
            "https://example.com/document.pdf",
            {
                model: ModelOptions.OPENAI_GPT_4O,
                outputDir: "./output",
                maintainFormat: true,
            }
        )
        console.log("Parsed Document:", parseResponse)

        // 生成摘要
        const summaryResponse = await agent.summarizeDocument(
            "https://example.com/document.pdf",
            {
                maxLength: 300,
                format: "bullet",
            }
        )
        console.log("Document Summary:", summaryResponse)

        // 处理用户问题
        const response = await agent.process(
            "请帮我分析这份文档的主要内容,并生成一个摘要。"
        )
        console.log("Agent Response:", response)
    } catch (error) {
        console.error("Error:", error)
    }
} 