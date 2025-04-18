import { NextRequest, NextResponse } from 'next/server';
import { getTextContent } from '@/lib/storage/minio-client';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const url = searchParams.get('url');

        if (!url) {
            return NextResponse.json({
                success: false,
                error: '缺少URL参数'
            }, { status: 400 });
        }

        // 从MinIO获取内容
        const content = await getTextContent(url);

        return NextResponse.json({
            success: true,
            content
        });
    } catch (error) {
        console.error('从MinIO获取内容失败:', error);

        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : '获取内容失败'
        }, { status: 500 });
    }
} 