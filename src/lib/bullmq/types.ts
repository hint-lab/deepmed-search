// 任务类型枚举
export enum TaskType {
    DOCUMENT_CONVERT_TO_MD = 'document-convert-to-md',
    DOCUMENT_SPLIT_TO_CHUNKS = 'document-split-to-chunks',
    CHUNK_VECTOR_INDEX = 'chunk-vector-index',
}

// 任务类型列表
export const TASK_TYPES = Object.values(TaskType);

// 队列健康状态
export interface QueueHealthStatus {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    redis: {
        status: 'connected' | 'disconnected';
        details: string;
        error: string | null;
    };
    queues: Record<string, any>;
    performance: {
        totalJobs: number;
        activeJobs: number;
        completedJobs: number;
        failedJobs: number;
    };
}

// 任务状态
export interface TaskStatus {
    state: string;
    result: any;
    data: any;
}

// 通用任务数据接口
export interface ProcessJobData {
    options: Record<string, any>;
}

// 文档处理任务数据
export interface DocumentConvertProcessJobData extends ProcessJobData {
    options: {
        model: string;
        maintainFormat: boolean;
        prompt?: string;
    };
}

export const JOB_OPTIONS = {
    attempts: 3,
    backoff: {
        type: 'exponential',
        delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
} as const;

export interface JobStatus {
    state: 'completed' | 'failed' | 'active' | 'waiting' | 'delayed' | 'paused' | 'not_found';
    progress: number;
    result?: any;
    failedReason?: string;
} 
