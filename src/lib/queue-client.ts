/**
 * 队列服务客户端 - 通过 HTTP API 访问队列服务
 * 用于替代直接调用队列管理器函数
 */
import { TaskType } from '@/lib/bullmq/types';
import { JobStatus, QueueHealthStatus } from '@/lib/bullmq/types';

// 获取队列 API 基础 URL
// 优先使用环境变量，否则使用当前域名（适用于同一服务器部署）
const getQueueApiBase = (): string => {
  // 服务器端：使用环境变量或默认 localhost
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_QUEUE_API_URL || 'http://localhost:3000';
  }
  // 客户端：使用环境变量或当前 origin
  return process.env.NEXT_PUBLIC_QUEUE_API_URL || window.location.origin;
};

const QUEUE_API_BASE = getQueueApiBase();

interface AddTaskResponse {
  success: boolean;
  data?: {
    jobId: string;
    taskType: TaskType;
    timestamp: string;
  };
  error?: string;
}

interface JobStatusResponse {
  success: boolean;
  data?: JobStatus;
  error?: string;
}

interface QueueHealthResponse {
  success: boolean;
  data?: QueueHealthStatus;
  error?: string;
}

/**
 * 添加任务到队列
 */
export async function addTaskViaAPI<TData = any>(
  taskType: TaskType,
  payload: TData
): Promise<AddTaskResponse> {
  try {
    const response = await fetch(`${QUEUE_API_BASE}/api/queue/add-task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskType,
        payload,
      }),
    });

    if (!response.ok) {
      // 尝试读取错误响应，可能是 JSON 也可能是 HTML
      let errorMessage = `HTTP ${response.status}`;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } else {
          const text = await response.text();
          errorMessage = text.substring(0, 200); // 只取前200个字符
        }
      } catch (e) {
        // 如果解析失败，使用默认错误消息
      }
      return {
        success: false,
        error: errorMessage,
      };
    }

    return await response.json();
  } catch (error) {
    console.error('[Queue Client] 添加任务失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '添加任务失败',
    };
  }
}

/**
 * 查询任务状态
 */
export async function getJobStatusViaAPI(jobId: string): Promise<JobStatusResponse> {
  try {
    const response = await fetch(
      `${QUEUE_API_BASE}/api/queue/job-status?jobId=${encodeURIComponent(jobId)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } else {
          const text = await response.text();
          errorMessage = text.substring(0, 200);
        }
      } catch (e) {
        // 如果解析失败，使用默认错误消息
      }
      return {
        success: false,
        error: errorMessage,
      };
    }

    return await response.json();
  } catch (error) {
    console.error('[Queue Client] 查询任务状态失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '查询任务状态失败',
    };
  }
}

/**
 * 检查队列健康状态
 */
export async function checkQueueHealthViaAPI(): Promise<QueueHealthResponse> {
  try {
    const response = await fetch(`${QUEUE_API_BASE}/api/queue/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || `HTTP ${response.status}`,
      };
    }

    return await response.json();
  } catch (error) {
    console.error('[Queue Client] 健康检查失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '健康检查失败',
    };
  }
}

