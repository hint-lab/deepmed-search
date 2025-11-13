/**
 * 文档信息 API
 * GET /api/document/[documentId]
 */
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ documentId: string }> }
) {
    try {
        // 验证用户身份
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json(
                { error: '未授权' },
                { status: 401 }
            );
        }

        const { documentId } = await params;

        if (!documentId) {
            return NextResponse.json(
                { error: '缺少 documentId 参数' },
                { status: 400 }
            );
        }

        // 查询文档（markdown_content 已迁移到 MinIO，URL 存储在 markdown_url）
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            select: {
                id: true,
                name: true,
                markdown_url: true, // markdown 的 URL（存储在 MinIO）
                file_url: true,
                type: true,
                processing_status: true,
                progress: true,
                progress_msg: true,
                knowledgeBaseId: true,
                chunk_num: true,
                token_num: true,
            }
        });

        if (!document) {
            return NextResponse.json(
                { error: '文档不存在' },
                { status: 404 }
            );
        }

        // 验证用户有权访问此文档（通过知识库）
        const kb = await prisma.knowledgeBase.findFirst({
            where: {
                id: document.knowledgeBaseId,
                created_by: session.user.id
            }
        });

        if (!kb) {
            return NextResponse.json(
                { error: '无权访问此文档' },
                { status: 403 }
            );
        }

        return NextResponse.json(document);
    } catch (error) {
        console.error('[Document API] 获取文档失败:', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : '获取文档失败',
            },
            { status: 500 }
        );
    }
}

