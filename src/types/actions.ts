/**
* 统一的Server Action响应格式
*/
export interface ServerActionResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
} 