import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { FileQueueService } from "@/services/file-queue.service";

const prisma = new PrismaClient();
const fileQueueService = new FileQueueService();

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const { documentId, knowledgeBaseId } = await request.json();

        if (!documentId || !knowledgeBaseId) {
            return NextResponse.json(
                { error: "缺少必要参数" },
                { status: 400 }
            );
        }

        // 获取文档信息
        const document = await prisma.document.findUnique({
            where: { id: documentId },
        });

        if (!document) {
            return NextResponse.json(
                { error: "文档不存在" },
                { status: 404 }
            );
        }

        // 检查文档状态
        if (document.processing_status !== 'completed') {
            return NextResponse.json(
                { error: "文档尚未处理完成" },
                { status: 400 }
            );
        }

        if (document.chunk_num > 0) {
            return NextResponse.json(
                { error: "文档已经处理过 chunks" },
                { status: 400 }
            );
        }

        // 更新文档状态为处理中
        await prisma.document.update({
            where: { id: documentId },
            data: {
                processing_status: 'processing',
                update_date: new Date(),
                update_time: BigInt(Date.now()),
            },
        });

        // 创建处理任务
        const taskId = await fileQueueService.addTask({
            filePath: document.location,
            type: "parse",
            options: {
                chunkConfig: {
                    maxLength: 1000,
                    overlap: 100,
                    minLength: 200,
                },
            },
            documentId,
        });

        return NextResponse.json({
            message: "开始处理文档 chunks",
            taskId,
        });
    } catch (error: any) {
        console.error("处理文档 chunks 错误:", error);
        return NextResponse.json(
            { error: "处理文档 chunks 失败" },
            { status: 500 }
        );
    }
} 