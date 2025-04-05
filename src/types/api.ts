/**
* 统一的响应格式
*/
export interface APIResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
} 