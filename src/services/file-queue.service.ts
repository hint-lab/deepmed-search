import { DocumentAgent } from "../agents/document-agent"
import { ModelOptions } from "zerox/node-zerox/dist/types"
import { EventEmitter } from "events"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// 定义分块配置接口
interface ChunkConfig {
    maxLength: number
    overlap: number
    minLength: number
}

// 默认分块配置
const DEFAULT_CHUNK_CONFIG: ChunkConfig = {
    maxLength: 1000,    // 最大块长度
    overlap: 100,       // 重叠长度
    minLength: 200,     // 最小块长度
}

export interface FileProcessTask {
    id: string
    filePath: string
    type: "parse" | "summarize"
    options: {
        model?: string
        outputDir?: string
        maxLength?: number
        format?: "bullet" | "paragraph"
        maintainFormat?: boolean
        cleanup?: boolean
        concurrency?: number
        chunkConfig?: ChunkConfig
    }
    status: "pending" | "processing" | "completed" | "failed"
    result?: any
    error?: string
    createdAt: Date
    updatedAt: Date
    documentId?: string
}

export class FileQueueService extends EventEmitter {
    private queue: FileProcessTask[] = []
    private isProcessing: boolean = false
    private agent: DocumentAgent
    private maxConcurrent: number = 3
    private processingTasks: Set<string> = new Set()

    constructor() {
        super()
        this.agent = new DocumentAgent({
            apiKey: process.env.OPENAI_API_KEY || "",
            baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
            model: ModelOptions.OPENAI_GPT_4O,
            temperature: 0.7,
        })
    }

    // 添加任务到队列
    async addTask(task: Omit<FileProcessTask, "id" | "status" | "createdAt" | "updatedAt">): Promise<string> {
        const newTask: FileProcessTask = {
            ...task,
            id: Math.random().toString(36).substring(7),
            status: "pending",
            createdAt: new Date(),
            updatedAt: new Date(),
        }

        this.queue.push(newTask)
        this.emit("taskAdded", newTask)
        this.processQueue()
        return newTask.id
    }

    // 获取任务状态
    getTaskStatus(taskId: string): FileProcessTask | null {
        return this.queue.find(task => task.id === taskId) || null
    }

    // 获取所有任务
    getAllTasks(): FileProcessTask[] {
        return [...this.queue]
    }

    // 取消任务
    cancelTask(taskId: string): boolean {
        const taskIndex = this.queue.findIndex(task => task.id === taskId)
        if (taskIndex === -1) return false

        const task = this.queue[taskIndex]
        if (task.status === "pending") {
            this.queue.splice(taskIndex, 1)
            this.emit("taskCancelled", taskId)
            return true
        }
        return false
    }

    // 处理队列
    private async processQueue() {
        if (this.isProcessing || this.processingTasks.size >= this.maxConcurrent) return

        this.isProcessing = true
        const pendingTasks = this.queue.filter(task => task.status === "pending")

        for (const task of pendingTasks) {
            if (this.processingTasks.size >= this.maxConcurrent) break

            this.processingTasks.add(task.id)
            this.updateTaskStatus(task.id, "processing")

            try {
                let result
                if (task.type === "parse") {
                    result = await this.agent.parseDocument(task.filePath, task.options)
                } else {
                    result = await this.agent.summarizeDocument(task.filePath, task.options)
                }

                this.updateTaskStatus(task.id, "completed", result)
                this.emit("taskCompleted", { taskId: task.id, result })

                // 更新数据库中的文档状态
                if (task.documentId) {
                    // 分割文档内容
                    const chunks = await this.splitDocumentContent(
                        result.content,
                        task.documentId,
                        task.options.chunkConfig || DEFAULT_CHUNK_CONFIG
                    )

                    // 更新文档状态
                    await this.updateDocumentStatus(task.documentId, {
                        markdown_content: result.content,
                        summary: result.summary,
                        metadata: {
                            ...result.metadata,
                            chunkCount: chunks.length,
                        },
                        processing_status: "completed",
                        processing_error: undefined,
                        chunk_num: chunks.length,
                    })
                }
            } catch (error: any) {
                this.updateTaskStatus(task.id, "failed", null, error.message)
                this.emit("taskFailed", { taskId: task.id, error: error.message })

                // 更新数据库中的文档状态
                if (task.documentId) {
                    await this.updateDocumentStatus(task.documentId, {
                        processing_status: "failed",
                        processing_error: error.message,
                    })
                }
            } finally {
                this.processingTasks.delete(task.id)
            }
        }

        this.isProcessing = false
    }

    // 更新任务状态
    private updateTaskStatus(taskId: string, status: FileProcessTask["status"], result?: any, error?: string) {
        const task = this.queue.find(t => t.id === taskId)
        if (task) {
            task.status = status
            task.result = result
            task.error = error
            task.updatedAt = new Date()
            this.emit("taskStatusUpdated", task)
        }
    }

    // 更新文档状态
    private async updateDocumentStatus(documentId: string, data: {
        markdown_content?: string
        summary?: string
        metadata?: any
        processing_status: string
        processing_error?: string
        chunk_num?: number
    }) {
        try {
            await prisma.document.update({
                where: { id: documentId },
                data: {
                    ...data,
                    updatedAt: new Date(),
                },
            })
        } catch (error) {
            console.error("更新文档状态失败:", error)
        }
    }

    // 分割文档内容
    private async splitDocumentContent(
        content: string,
        documentId: string,
        config: ChunkConfig
    ): Promise<string[]> {
        const chunks: string[] = []
        let currentPosition = 0
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            include: { knowledgeBase: true },
        })

        if (!document) {
            throw new Error("文档不存在")
        }

        while (currentPosition < content.length) {
            // 找到合适的分割点
            let endPosition = currentPosition + config.maxLength
            if (endPosition > content.length) {
                endPosition = content.length
            } else {
                // 尝试在段落或句子边界分割
                const nextParagraph = content.indexOf("\n\n", currentPosition + config.minLength)
                const nextSentence = content.indexOf(". ", currentPosition + config.minLength)

                if (nextParagraph !== -1 && nextParagraph < endPosition) {
                    endPosition = nextParagraph + 2
                } else if (nextSentence !== -1 && nextSentence < endPosition) {
                    endPosition = nextSentence + 1
                }
            }

            // 提取当前块
            const chunk = content.slice(currentPosition, endPosition).trim()
            if (chunk.length >= config.minLength) {
                // 创建块记录
                await prisma.chunk.create({
                    data: {
                        chunk_id: `${documentId}-${chunks.length}`,
                        content_with_weight: chunk,
                        doc_id: documentId,
                        doc_name: document.name,
                        kb_id: document.knowledgeBaseId,
                        important_kwd: [], // 可以后续添加关键词提取
                        question_kwd: [],   // 可以后续添加问题关键词提取
                        tag_kwd: [],        // 可以后续添加标签提取
                        positions: {
                            start: currentPosition,
                            end: endPosition,
                        },
                    },
                })
                chunks.push(chunk)
            }

            // 移动到下一个位置，考虑重叠
            currentPosition = endPosition - config.overlap
        }

        return chunks
    }

    // 设置最大并发数
    setMaxConcurrent(value: number) {
        this.maxConcurrent = value
        this.processQueue()
    }
} 