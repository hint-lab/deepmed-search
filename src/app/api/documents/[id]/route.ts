import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { unlink } from "fs/promises";
import { join } from "path";

const prisma = new PrismaClient();

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        // 获取文档信息
        const document = await prisma.document.findUnique({
            where: { id },
        });

        if (!document) {
            return NextResponse.json(
                { error: "文档不存在" },
                { status: 404 }
            );
        }

        // 删除物理文件
        try {
            await unlink(document.location);
        } catch (error) {
            console.error("删除物理文件失败:", error);
            // 继续执行，即使物理文件删除失败
        }

        // 删除数据库记录
        await prisma.document.delete({
            where: { id },
        });

        return NextResponse.json({
            message: "文档删除成功",
        });
    } catch (error: any) {
        console.error("删除文档错误:", error);
        return NextResponse.json(
            { error: "删除文档失败" },
            { status: 500 }
        );
    }
} 