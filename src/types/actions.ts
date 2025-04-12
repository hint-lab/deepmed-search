/**
 * 服务器操作响应类型
 * @template T 响应数据类型
 */
export interface ServerActionResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    details?: string;
} 