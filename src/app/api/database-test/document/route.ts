import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const documentId = searchParams.get('documentId');

        if (!documentId) {
            return NextResponse.json({
                success: false,
                error: '缺少文档ID参数'
            }, { status: 400 });
        }

        // 查询文档
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            include: {
                uploadFile: true
            }
        });

        if (!document) {
            return NextResponse.json({
                success: false,
                error: '文档不存在'
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            document
        });
    } catch (error) {
        console.error('查询文档失败:', error);

        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : '查询文档失败'
        }, { status: 500 });
    }
} 