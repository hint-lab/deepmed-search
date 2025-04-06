import { NextRequest, NextResponse } from "next/server"
import { FileQueueService } from "@/services/file-queue.service"

const fileQueueService = new FileQueueService()

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { filePath, maxLength, format } = body

        if (!filePath) {
            return NextResponse.json(
                { error: "文件路径不能为空" },
                { status: 400 }
            )
        }

        const task = await fileQueueService.addTask({
            filePath,
            type: "summarize",
            options: {
                maxLength: maxLength || 500,
                format: format || "paragraph",
            },
        })

        return NextResponse.json({
            message: "摘要任务创建成功",
            taskId: task,
        })
    } catch (error: any) {
        console.error("创建摘要任务错误:", error)
        return NextResponse.json(
            { error: "创建摘要任务失败" },
            { status: 500 }
        )
    }
} 