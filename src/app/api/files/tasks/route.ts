import { NextRequest, NextResponse } from "next/server"
import { FileQueueService } from "@/services/file-queue.service"

const fileQueueService = new FileQueueService()

export async function GET(request: NextRequest) {
    try {
        const tasks = fileQueueService.getAllTasks()
        return NextResponse.json(tasks)
    } catch (error: any) {
        console.error("获取任务列表错误:", error)
        return NextResponse.json(
            { error: "获取任务列表失败" },
            { status: 500 }
        )
    }
} 