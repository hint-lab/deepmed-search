import { NextRequest, NextResponse } from "next/server"
import { FileQueueService } from "@/services/file-queue.service"

const fileQueueService = new FileQueueService()

export async function GET(
    request: NextRequest,
    { params }: { params: { taskId: string } }
) {
    try {
        const task = fileQueueService.getTaskStatus(params.taskId)
        if (!task) {
            return NextResponse.json(
                { error: "任务不存在" },
                { status: 404 }
            )
        }
        return NextResponse.json(task)
    } catch (error: any) {
        console.error("获取任务状态错误:", error)
        return NextResponse.json(
            { error: "获取任务状态失败" },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { taskId: string } }
) {
    try {
        const success = fileQueueService.cancelTask(params.taskId)
        if (!success) {
            return NextResponse.json(
                { error: "无法取消任务" },
                { status: 400 }
            )
        }
        return NextResponse.json({ message: "任务已取消" })
    } catch (error: any) {
        console.error("取消任务错误:", error)
        return NextResponse.json(
            { error: "取消任务失败" },
            { status: 500 }
        )
    }
} 