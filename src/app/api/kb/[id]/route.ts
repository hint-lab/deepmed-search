import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const kb = await prisma.knowledgeBase.findUnique({
            where: { id: params.id },
            include: {
                documents: true,
                tags: true,
            },
        });
        return NextResponse.json({ data: kb, code: 0 });
    } catch (error) {
        return NextResponse.json({ data: null, code: 1, message: '获取知识库详情失败' });
    }
} 