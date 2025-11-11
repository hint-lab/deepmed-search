/**
 * 队列服务 API - 健康检查
 * GET /api/queue/health
 */
import { NextRequest, NextResponse } from 'next/server';
import { checkQueueHealth } from '@/lib/bullmq/queue-manager';

export async function GET(req: NextRequest) {
  try {
    const health = await checkQueueHealth();

    return NextResponse.json({
      success: true,
      data: health,
    });
  } catch (error) {
    console.error('[Queue API] 健康检查失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '健康检查失败',
      },
      { status: 500 }
    );
  }
}

