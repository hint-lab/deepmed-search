/**
 * 队列服务 API - 查询任务状态
 * GET /api/queue/job-status?jobId=xxx
 */
import { NextRequest, NextResponse } from 'next/server';
import { getJobStatus } from '@/lib/bullmq/queue-manager';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // 验证用户身份
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: '未授权' },
        { status: 401 }
      );
    }

    const jobId = req.nextUrl.searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: '缺少 jobId 参数' },
        { status: 400 }
      );
    }

    const status = await getJobStatus(jobId);

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('[Queue API] 查询任务状态失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '查询任务状态失败',
      },
      { status: 500 }
    );
  }
}

