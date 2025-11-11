/**
 * 队列服务 API - 添加任务
 * POST /api/queue/add-task
 */
import { NextRequest, NextResponse } from 'next/server';
import { addTask } from '@/lib/bullmq/queue-manager';
import { TaskType } from '@/lib/bullmq/types';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // 验证用户身份
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: '未授权' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { taskType, payload } = body;

    // 验证必需参数
    if (!taskType || !payload) {
      return NextResponse.json(
        { success: false, error: '缺少必需参数: taskType 或 payload' },
        { status: 400 }
      );
    }

    // 验证任务类型
    if (!Object.values(TaskType).includes(taskType)) {
      return NextResponse.json(
        { success: false, error: `无效的任务类型: ${taskType}` },
        { status: 400 }
      );
    }

    // 将用户ID添加到 payload 中
    const taskPayload = {
      ...payload,
      userId: session.user.id,
    };

    // 添加任务到队列
    const job = await addTask(taskType, taskPayload);

    return NextResponse.json({
      success: true,
      data: {
        jobId: job.id,
        taskType,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Queue API] 添加任务失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '添加任务失败',
      },
      { status: 500 }
    );
  }
}

