import { QUEUE_CONFIG, TaskType } from './queue-constants';

/**
 * 添加任务到队列
 * @param type 任务类型
 * @param data 任务数据
 * @returns 任务ID
 */
export async function addTask(type: TaskType, data: any): Promise<string> {
    try {
        const response = await fetch(`${QUEUE_CONFIG.URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type,
                data,
            }),
        });

        if (!response.ok) {
            throw new Error(`队列服务响应错误: ${response.statusText}`);
        }

        const result = await response.json();
        return result.jobId;
    } catch (error) {
        console.error('添加任务失败:', error);
        throw error;
    }
}

/**
 * 获取任务状态
 * @param jobId 任务ID
 * @returns 任务状态和结果
 */
export async function getTaskStatus(jobId: string): Promise<{
    state: string;
    result?: any;
}> {
    try {
        const response = await fetch(`${QUEUE_CONFIG.URL}/tasks/${jobId}`);

        if (!response.ok) {
            throw new Error(`队列服务响应错误: ${response.statusText}`);
        }

        const result = await response.json();
        return {
            state: result.state,
            result: result.result,
        };
    } catch (error) {
        console.error('获取任务状态失败:', error);
        throw error;
    }
} 