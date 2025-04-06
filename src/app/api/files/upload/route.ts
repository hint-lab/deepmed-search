import { NextRequest, NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import { join } from "path"
import { FileQueueService } from "@/services/file-queue.service"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const fileQueueService = new FileQueueService()

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get("file") as File
        const knowledgeBaseId = formData.get("knowledgeBaseId") as string
        const userId = formData.get("userId") as string
        const chunkConfig = formData.get("chunkConfig") as string

        if (!file) {
            return NextResponse.json(
                { error: "没有上传文件" },
                { status: 400 }
            )
        }

        if (!knowledgeBaseId || !userId) {
            return NextResponse.json(
                { error: "缺少必要参数" },
                { status: 400 }
            )
        }

        // 验证文件类型
        const allowedTypes = [".pdf", ".doc", ".docx", ".txt", ".html", ".xml"]
        const ext = "." + file.name.split(".").pop()?.toLowerCase()
        if (!allowedTypes.includes(ext)) {
            return NextResponse.json(
                { error: "不支持的文件类型" },
                { status: 400 }
            )
        }

        // 验证文件大小（10MB）
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json(
                { error: "文件大小超过限制" },
                { status: 400 }
            )
        }

        // 保存文件
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const uploadDir = join(process.cwd(), "uploads")
        const filePath = join(uploadDir, file.name)
        await writeFile(filePath, buffer)

        // 创建数据库记录
        const document = await prisma.document.create({
            data: {
                name: file.name,
                location: filePath,
                size: file.size,
                type: ext.substring(1),
                source_type: "upload",
                status: "enabled",
                create_date: new Date(),
                create_time: BigInt(Date.now()),
                update_date: new Date(),
                update_time: BigInt(Date.now()),
                created_by: userId,
                knowledgeBaseId,
                parser_config: {},
                processing_status: "pending",
            },
        })

        // 解析分块配置
        let parsedChunkConfig
        if (chunkConfig) {
            try {
                parsedChunkConfig = JSON.parse(chunkConfig)
            } catch (error) {
                console.error("分块配置解析错误:", error)
            }
        }

        // 创建处理任务
        const task = await fileQueueService.addTask({
            filePath,
            type: "parse",
            options: {
                model: formData.get("model") as string,
                outputDir: "output",
                maintainFormat: true,
                chunkConfig: parsedChunkConfig,
            },
            documentId: document.id,
        })

        return NextResponse.json({
            message: "文件上传成功",
            taskId: task,
            documentId: document.id,
        })
    } catch (error: any) {
        console.error("文件上传错误:", error)
        return NextResponse.json(
            { error: "文件上传失败" },
            { status: 500 }
        )
    }
} 