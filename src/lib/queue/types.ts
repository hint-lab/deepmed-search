// 队列配置类型
export interface QueueConfig {
    url: string;
    prefix: string;
    healthCheck: {
        maxRetries: number;
        retryDelay: number;
        timeout: number;
    };
}

// 队列健康信息类型
export interface QueueHealthInfo {
    status: 'healthy' | 'unhealthy';
    details: {
        jobCounts: {
            waiting: number;
            active: number;
            completed: number;
            failed: number;
        };
        isPaused: boolean;
        workers: any[];
        rateLimit: number | null;
    };
}

// 队列健康状态类型
export interface QueueHealthStatus {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    queues: Record<string, QueueHealthInfo>;
    redis: {
        status: 'connected' | 'disconnected';
        details?: string;
        error: string | null;
    };
    performance: {
        totalJobs: number;
        activeJobs: number;
        completedJobs: number;
        failedJobs: number;
    };
}

// 任务状态类型
export interface TaskStatus {
    state: string;
    result?: any;
}

// 任务参数类型
export interface TaskParams {
    type: string;
    data: any;
}

// 任务响应类型
export interface TaskResponse {
    jobId: string;
} 