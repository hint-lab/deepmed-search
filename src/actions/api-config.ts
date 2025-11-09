'use server';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth-utils';
import { Session } from 'next-auth';

/**
 * API配置接口
 */
export interface UserApiConfigData {
    openaiBaseUrl?: string;
    openaiApiKey?: string;
    openaiApiModel?: string;
    deepseekApiKey?: string;
    deepseekBaseUrl?: string;
    geminiApiKey?: string;
    geminiBaseUrl?: string;
    tavilyApiKey?: string;
    searchProvider?: string;
    jinaApiKey?: string;
    ncbiApiKey?: string;
}

/**
 * 获取用户的API配置
 */
export const getUserApiConfig = withAuth(async (session: Session) => {
    if (!session.user?.id) {
        return { success: false, error: '用户ID不存在' };
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
            apiConfig: true,
        },
    });

    if (!user) {
        return { success: false, error: '用户不存在' };
    }

    // 如果没有配置，返回空对象
    if (!user.apiConfig) {
        return { success: true, data: null };
    }

    return { success: true, data: user.apiConfig };
});

/**
 * 保存或更新用户的API配置
 */
export const saveUserApiConfig = withAuth(async (
    session: Session,
    config: UserApiConfigData
) => {
    if (!session.user?.id) {
        return { success: false, error: '用户ID不存在' };
    }

    try {
        // 使用 upsert 来创建或更新配置
        const apiConfig = await prisma.userApiConfig.upsert({
            where: { userId: session.user.id },
            update: {
                openaiBaseUrl: config.openaiBaseUrl || null,
                openaiApiKey: config.openaiApiKey || null,
                openaiApiModel: config.openaiApiModel || null,
                deepseekApiKey: config.deepseekApiKey || null,
                deepseekBaseUrl: config.deepseekBaseUrl || null,
                geminiApiKey: config.geminiApiKey || null,
                geminiBaseUrl: config.geminiBaseUrl || null,
                tavilyApiKey: config.tavilyApiKey || null,
                searchProvider: config.searchProvider || null,
                jinaApiKey: config.jinaApiKey || null,
                ncbiApiKey: config.ncbiApiKey || null,
                updatedAt: new Date(),
            },
            create: {
                userId: session.user.id,
                openaiBaseUrl: config.openaiBaseUrl || null,
                openaiApiKey: config.openaiApiKey || null,
                openaiApiModel: config.openaiApiModel || null,
                deepseekApiKey: config.deepseekApiKey || null,
                deepseekBaseUrl: config.deepseekBaseUrl || null,
                geminiApiKey: config.geminiApiKey || null,
                geminiBaseUrl: config.geminiBaseUrl || null,
                tavilyApiKey: config.tavilyApiKey || null,
                searchProvider: config.searchProvider || null,
                jinaApiKey: config.jinaApiKey || null,
                ncbiApiKey: config.ncbiApiKey || null,
            },
        });

        return { success: true, data: apiConfig };
    } catch (error) {
        console.error('保存API配置失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '保存API配置失败',
        };
    }
});

/**
 * 重置用户的API配置（删除所有配置）
 */
export const resetUserApiConfig = withAuth(async (session: Session) => {
    if (!session.user?.id) {
        return { success: false, error: '用户ID不存在' };
    }

    try {
        await prisma.userApiConfig.delete({
            where: { userId: session.user.id },
        });

        return { success: true };
    } catch (error) {
        // 如果配置不存在，也视为成功
        if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
            return { success: true };
        }
        console.error('重置API配置失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '重置API配置失败',
        };
    }
});

