import { OpenAIAgent, OpenAIConfig } from "./openai-agent"
import { Tool } from "./base-agent"
import { z } from "zod"
import { ModelOptions, ModelProvider } from "zerox/node-zerox/dist/types"
import type { ZeroxOutput, Page as ZeroxPage } from "zerox/node-zerox/dist/types"
import { join } from "path"
import { getFileStream, ensureBucketExists } from "@/lib/minio"
import { writeFile, unlink, mkdir } from "fs/promises"
import { existsSync } from "fs"
import { v4 as uuidv4 } from "uuid"
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
    tempDir?: string
    maxImageSize?: number
    imageDensity?: number
    imageHeight?: number
    maxTesseractWorkers?: number
    correctOrientation?: boolean
    trimEdges?: boolean
}

// 从 MinIO 获取文件并保存到临时目录
async function getFileFromMinio(bucketName: string, objectName: string, tempDir?: string): Promise<string> {
    // 确保存储桶存在
    await ensureBucketExists(bucketName)

    // 使用指定的临时目录或默认目录
    const baseDir = tempDir || join(process.cwd(), "uploads", "temp")
    if (!existsSync(baseDir)) {
        await mkdir(baseDir, { recursive: true })
    }

    // 生成临时文件路径，使用完整的 objectName 作为文件名的一部分
    const tempFileName = `${uuidv4()}-${objectName.replace(/\//g, '_')}`
    const tempFilePath = join(baseDir, tempFileName)

    try {
        // 从 MinIO 获取文件流
        const fileStream = await getFileStream(bucketName, objectName)

        // 将流转换为 Buffer
        const chunks: Buffer[] = []
        for await (const chunk of fileStream) {
            chunks.push(Buffer.from(chunk))
        }
        const buffer = Buffer.concat(chunks)

        // 写入临时文件
        await writeFile(tempFilePath, buffer)

        return tempFilePath
    } catch (error) {
        console.error("从 MinIO 获取文件失败:", error)
        throw error
    }
}

// 文档解析工具
const documentParseTool: Tool = {
    name: "parse_document",
    description: "使用 ZeroX 解析文档内容",
    parameters: z.object({
        bucketName: z.string().describe("MinIO 存储桶名称"),
        objectName: z.string().describe("MinIO 对象名称"),
        fileName: z.string().describe("文档文件名"),
        model: z.string().optional().describe("使用的模型名称"),
        outputDir: z.string().optional().describe("输出目录"),
        maintainFormat: z.boolean().optional().describe("是否保持格式"),
        cleanup: z.boolean().optional().describe("是否清理临时文件"),
        concurrency: z.number().optional().describe("并发处理数量"),
        tempDir: z.string().optional().describe("临时文件目录"),
        maxImageSize: z.number().optional().describe("最大图片大小(MB)"),
        imageDensity: z.number().optional().describe("图片DPI"),
        imageHeight: z.number().optional().describe("最大图片高度"),
        maxTesseractWorkers: z.number().optional().describe("最大Tesseract工作进程数"),
        correctOrientation: z.boolean().optional().describe("是否自动纠正页面方向"),
        trimEdges: z.boolean().optional().describe("是否裁剪边缘"),
        directImageExtraction: z.boolean().optional().describe("是否直接从文档图片提取数据"),
        extractionPrompt: z.string().optional().describe("数据提取提示词"),
        extractOnly: z.boolean().optional().describe("是否仅提取结构化数据"),
        extractPerPage: z.boolean().optional().describe("是否按页提取数据"),
        pagesToConvertAsImages: z.union([z.number(), z.array(z.number())]).optional().describe("需要转换为图片的页面"),
        prompt: z.string().optional().describe("文档处理提示词"),
        schema: z.any().optional().describe("结构化数据提取模式"),
    }),
    handler: async ({
        bucketName,
        objectName,
        fileName,
        model = ModelOptions.OPENAI_GPT_4O_MINI,
        outputDir,
        maintainFormat = false,
        cleanup = true,
        concurrency = 10,
        tempDir,
        maxImageSize,
        imageDensity,
        imageHeight,
        maxTesseractWorkers,
        correctOrientation,
        trimEdges,
        directImageExtraction,
        extractionPrompt,
        extractOnly,
        extractPerPage,
        pagesToConvertAsImages,
        prompt,
        schema,
    }) => {
        let tempFilePath: string | null = null;

        try {
            // 从 MinIO 获取文件
            console.log('解析文档:', {
                bucketName,
                objectName,
                fileName,
                model,
            });
            tempFilePath = await getFileFromMinio(bucketName, objectName, tempDir);

            const { zerox } = await import("zerox");

            console.log('Tesseract Paths:', {
                worker: process.env.TESS_WORKER_PATH,
                core: process.env.TESS_CORE_PATH,
                dataPrefix: process.env.TESSDATA_PREFIX
            });

            // console.log('Calling zerox with maxTesseractWorkers: 0 to disable internal OCR');

            const result = await zerox({
                filePath: tempFilePath,
                modelProvider: ModelProvider.OPENAI,
                model,
                credentials: {
                    apiKey: process.env.OPENAI_API_KEY || "",
                },
                outputDir,
                maintainFormat,
                cleanup,
                concurrency,
                tempDir,
                maxImageSize,
                imageDensity,
                imageHeight,
                correctOrientation,
                trimEdges,
                directImageExtraction,
                extractionPrompt,
                extractOnly,
                extractPerPage,
                pagesToConvertAsImages,
                prompt,
                schema,
                maxTesseractWorkers: -1,
            }) as ZeroxOutput;

            // 返回解析结果，不进行数据库操作
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
                    // 不再返回数据库相关信息
                },
            };
        } finally {
            // 清理临时文件
            if (cleanup && tempFilePath) {
                try {
                    await unlink(tempFilePath);
                } catch (error) {
                    console.error("清理临时文件失败:", error);
                }
            }
        }
    },
}

// 文档摘要工具
const documentSummaryTool: Tool = {
    name: "summarize_document",
    description: "生成文档摘要",
    parameters: z.object({
        bucketName: z.string().describe("MinIO 存储桶名称"),
        objectName: z.string().describe("MinIO 对象名称"),
        fileName: z.string().describe("文档文件名"),
        model: z.string().optional().describe("使用的模型名称"),
        maxLength: z.number().optional().describe("摘要最大长度"),
        format: z.enum(["bullet", "paragraph"]).optional().describe("摘要格式"),
    }),
    handler: async ({ bucketName, objectName, fileName, model = ModelOptions.OPENAI_GPT_4O, maxLength = 500, format = "paragraph" }) => {
        let tempFilePath: string | null = null

        try {
            // 从 MinIO 获取文件
            tempFilePath = await getFileFromMinio(bucketName, objectName)

            const { zerox } = await import("zerox")
            const result = await zerox({
                filePath: tempFilePath,
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
        } finally {
            // 清理临时文件
            if (tempFilePath) {
                try {
                    await unlink(tempFilePath)
                } catch (error) {
                    console.error("清理临时文件失败:", error)
                }
            }
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
    async parseDocument(filePath: string, fileName: string, options?: {
        model?: string
        outputDir?: string
        maintainFormat?: boolean
        cleanup?: boolean
        concurrency?: number
        tempDir?: string
        maxImageSize?: number
        imageDensity?: number
        imageHeight?: number
        maxTesseractWorkers?: number
        correctOrientation?: boolean
        trimEdges?: boolean
        directImageExtraction?: boolean
        extractionPrompt?: string
        extractOnly?: boolean
        extractPerPage?: boolean
        pagesToConvertAsImages?: number | number[]
        prompt?: string
        schema?: any
    }) {
        // 从文件路径中提取 bucket 和 object 名称
        const objectName = filePath
        const bucketName = process.env.MINIO_BUCKET_NAME
        console.log('解析文档:', {
            filePath,
            bucketName,
            objectName,
            fileName,
            ...options
        })

        return await this.handleToolCall("parse_document", {
            bucketName,
            objectName,
            fileName,
            ...options,
        })
    }

    // 生成文档摘要
    async summarizeDocument(filePath: string, fileName: string, options?: {
        model?: string
        maxLength?: number
        format?: "bullet" | "paragraph"
    }) {
        const objectName = filePath
        const bucketName = process.env.MINIO_BUCKET_NAME
        return await this.handleToolCall("summarize_document", {
            bucketName,
            objectName,
            fileName,
            ...options,
        })
    }
}

// // 示例:如何使用文档处理 Agent
// export async function documentAgentExample() {
//     const agent = new DocumentAgent({
//         apiKey: process.env.OPENAI_API_KEY || "",
//         zeroxApiKey: process.env.ZEROX_API_KEY || "",
//         baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
//         model: process.env.OPENAI_MODEL_NAME || "gpt-4o-mini",
//         temperature: 0.7,
//     })

//     try {
//         // 解析文档
//         const parseResponse = await agent.parseDocument(
//             "https://example.com/document.pdf",
//             {
//                 model: ModelOptions.OPENAI_GPT_4O,
//                 outputDir: "./output",
//                 maintainFormat: true,
//             }
//         )
//         console.log("Parsed Document:", parseResponse)

//         // 生成摘要
//         const summaryResponse = await agent.summarizeDocument(
//             "https://example.com/document.pdf",
//             {
//                 maxLength: 300,
//                 format: "bullet",
//             }
//         )
//         console.log("Document Summary:", summaryResponse)

//         // 处理用户问题
//         const response = await agent.process(
//             "请帮我分析这份文档的主要内容,并生成一个摘要。"
//         )
//         console.log("Agent Response:", response)
//     } catch (error) {
//         console.error("Error:", error)
//     }
