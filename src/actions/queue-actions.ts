'use server';

import { QUEUE_NAMES, getQueueStatus, addJob, queues, connection } from '@/lib/bullmq';

// 获取所有队列状态的Server Action
export async function getAllQueueStatus() {
    try {
        // 获取所有队列的状态
        const queueStatuses = await Promise.all(
            Object.values(QUEUE_NAMES).map(async (queueName) => {
                try {
                    const status = await getQueueStatus(queueName);
                    return {
                        name: queueName,
                        ...status
                    };
                } catch (error) {
                    return {
                        name: queueName,
                        error: (error as Error).message,
                        status: 'error'
                    };
                }
            })
        );

        return {
            success: true,
            queues: queueStatuses,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('获取队列状态失败:', error);
        return {
            success: false,
            error: '获取队列状态失败',
            details: (error as Error).message
        };
    }
}

// 添加任务到队列的Server Action
export async function addJobToQueue(queueName: string, data: any) {
    try {
        // 验证请求数据
        if (!queueName || !(queueName in QUEUE_NAMES)) {
            return {
                success: false,
                error: '无效的队列名称'
            };
        }

        if (!data) {
            return {
                success: false,
                error: '缺少任务数据'
            };
        }

        // 添加任务到队列
        const job = await addJob(queueName, data);

        return {
            success: true,
            jobId: job.id,
            message: `任务已添加到队列: ${queueName}`
        };
    } catch (error) {
        console.error('添加任务失败:', error);
        return {
            success: false,
            error: '添加任务失败',
            details: (error as Error).message
        };
    }
}

// 执行队列健康测试的Server Action
export async function testQueueHealth() {
    const startTime = Date.now();
    const results: any = {
        timestamp: new Date().toISOString(),
        duration: 0,
        redis: { status: 'unknown' },
        queues: {},
        overallStatus: 'unknown'
    };

    try {
        // 1. 测试Redis连接
        try {
            const pingResult = await connection.ping();
            results.redis = {
                status: 'connected',
                ping: pingResult === 'PONG' ? 'success' : 'failed',
                details: `Redis responded with: ${pingResult}`
            };
        } catch (error) {
            results.redis = {
                status: 'error',
                error: (error as Error).message
            };
            throw new Error(`Redis连接失败: ${(error as Error).message}`);
        }

        // 2. 检查所有队列状态
        const queueNames = Object.values(QUEUE_NAMES);

        for (const queueName of queueNames) {
            results.queues[queueName] = { status: 'unknown' };

            try {
                // 检查队列是否存在
                const queue = queues[queueName];
                if (!queue) {
                    results.queues[queueName] = {
                        status: 'missing',
                        error: '队列对象不存在'
                    };
                    continue;
                }

                // 获取队列状态
                const status = await getQueueStatus(queueName);

                // 尝试添加测试任务
                const testPayload = {
                    test: true,
                    timestamp: Date.now(),
                    message: '健康测试任务'
                };

                const testJob = await addJob(queueName, testPayload);

                results.queues[queueName] = {
                    status: 'healthy',
                    details: status,
                    testJob: {
                        id: testJob.id,
                        added: true
                    }
                };

            } catch (error) {
                results.queues[queueName] = {
                    status: 'error',
                    error: (error as Error).message
                };
            }
        }

        // 3. 综合状态评估
        const hasErrors = Object.values(results.queues).some(
            (q: any) => q.status === 'error' || q.status === 'missing'
        );

        const redisOk = results.redis.status === 'connected';

        if (!redisOk) {
            results.overallStatus = 'critical';
        } else if (hasErrors) {
            results.overallStatus = 'warning';
        } else {
            results.overallStatus = 'healthy';
        }

        results.success = true;

    } catch (error) {
        results.overallStatus = 'critical';
        results.success = false;
        results.error = (error as Error).message;
    } finally {
        results.duration = Date.now() - startTime;
    }

    return results;
} 