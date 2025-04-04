import { auth } from '@/lib/auth';
import { Session } from 'next-auth';

/**
 * 统一的响应格式
 */
export type ActionResponse<T = any> = {
    success: boolean;
    data?: T;
    error?: string;
};

/**
 * 高阶函数,用于处理需要认证的服务器动作
 * @param handler 实际的业务处理函数
 * @returns 包装后的服务器动作函数
 */
export function withAuth<T = any, P extends any[] = any[]>(
    handler: (session: Session, ...args: P) => Promise<ActionResponse<T>>
) {
    return async (...args: P): Promise<ActionResponse<T>> => {
        try {
            const session = await auth();
            if (!session?.user?.email) {
                return { success: false, error: '未登录' };
            }
            return handler(session, ...args);
        } catch (error) {
            console.error('服务器动作执行失败:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '服务器动作执行失败'
            };
        }
    };
}
