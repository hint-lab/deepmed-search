/**
 * MinerU API 配置
 */
export interface MinerUConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

/**
 * MinerU 任务选项
 */
export interface MinerUTaskOptions {
  fileUrl: string;
  fileName?: string;
  model?: string;
  maintainFormat?: boolean;
  prompt?: string;
  [key: string]: any;
}

/**
 * MinerU 任务状态
 */
export enum MinerUTaskState {
  PENDING = 'pending',
  PROCESSING = 'processing',
  DONE = 'done',
  FAILED = 'failed',
}

/**
 * MinerU 任务响应
 */
export interface MinerUTaskResponse {
  success: boolean;
  data?: {
    task_id: string;
  };
  error?: string;
}

/**
 * MinerU 任务状态响应
 */
export interface MinerUTaskStatusResponse {
  success: boolean;
  data?: {
    task_id: string;
    state: MinerUTaskState;
    progress?: number;
    full_zip_url?: string;
    err_msg?: string;
  };
  error?: string;
}

/**
 * MinerU 处理结果
 */
export interface MinerUProcessResult {
  success: boolean;
  data?: {
    pages?: Array<{
      pageNum: number;
      content: string;
      tokens?: number;
    }>;
    extracted?: string;
    summary?: string | null;
  };
  error?: string;
  metadata: {
    processingTime: number;
    documentId: string;
    completionTime?: number;
    fileName?: string;
    inputTokens?: number;
    outputTokens?: number;
  };
}

