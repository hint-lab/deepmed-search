import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // 尝试执行一个简单的查询来测试连接
        const result = await prisma.$queryRaw`SELECT 1 as connected`;

        return NextResponse.json({
            success: true,
            message: '数据库连接成功',
            data: result
        });
    } catch (error) {
        console.error('数据库连接测试失败:', error);

        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : '数据库连接失败'
        }, { status: 500 });
    }
} 