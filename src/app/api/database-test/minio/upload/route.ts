import { NextRequest, NextResponse } from 'next/server';
import { uploadTextContent } from '@/lib/storage/minio-client';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { content } = body;

        if (!content) {
            return NextResponse.json({
                success: false,
                error: '缺少内容参数'
            }, { status: 400 });
        }

        // 上传内容到MinIO
        const url = await uploadTextContent(
            content,
            'test-content'
        );

        return NextResponse.json({
            success: true,
            url
        });
    } catch (error) {
        console.error('上传内容到MinIO失败:', error);

        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : '上传内容失败'
        }, { status: 500 });
    }
} 