import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const { status } = await request.json();

        if (!status) {
            return NextResponse.json(
                { error: "缺少状态参数" },
                { status: 400 }
            );
        }

        // 验证状态值
        const validStatuses = ["enabled", "disabled"];
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { error: "无效的状态值" },
                { status: 400 }
            );
        }

        // 更新文档状态
        const document = await prisma.document.update({
            where: { id },
            data: {
                status,
                update_date: new Date(),
                update_time: BigInt(Date.now()),
            },
        });

        return NextResponse.json({
            message: "状态更新成功",
            document,
        });
    } catch (error: any) {
        console.error("更新文档状态错误:", error);
        return NextResponse.json(
            { error: "更新文档状态失败" },
            { status: 500 }
        );
    }
} 