'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { hash } from 'bcryptjs';
import { withAuth } from '@/lib/auth-utils';
import { Session } from 'next-auth';

/**
 * 获取用户信息
 */
export const getUserInfo = withAuth(async (session: Session) => {
    if (!session.user?.email) {
        return { success: false, error: '用户邮箱不存在' };
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: {
            tenant: true,
        },
    });

    if (!user) {
        return { success: false, error: '用户不存在' };
    }

    return { success: true, data: user };
});

/**
 * 更新用户设置
 */
export const updateUserSettings = withAuth(async (session: Session, data: {
    language?: string;
    new_password?: string;
}) => {
    if (!session.user?.email) {
        return { success: false, error: '用户邮箱不存在' };
    }

    const updateData: any = {};
    if (data.language) {
        updateData.language = data.language;
    }
    if (data.new_password) {
        updateData.password = await hash(data.new_password, 10);
    }

    const user = await prisma.user.update({
        where: { email: session.user.email },
        data: updateData,
    });

    revalidatePath('/user-settings');
    return { success: true, data: user };
});

/**
 * 获取租户信息
 */
export const getTenantInfo = withAuth(async (session: Session) => {
    if (!session.user?.email) {
        return { success: false, error: '用户邮箱不存在' };
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: {
            tenant: true,
        },
    });

    if (!user?.tenant) {
        return { success: false, error: '租户不存在' };
    }

    return { success: true, data: user.tenant };
});

/**
 * 获取系统状态
 */
export const getSystemStatus = async () => {
    try {
        const status = await prisma.systemStatus.findFirst();
        return { success: true, data: status };
    } catch (error) {
        console.error('获取系统状态失败:', error);
        return { success: false, error: '获取系统状态失败' };
    }
};

/**
 * 获取系统版本
 */
export const getSystemVersion = async () => {
    try {
        const version = process.env.NEXT_PUBLIC_VERSION || '1.0.0';
        return { success: true, data: version };
    } catch (error) {
        console.error('获取系统版本失败:', error);
        return { success: false, error: '获取系统版本失败' };
    }
};

/**
 * 获取系统令牌列表
 */
export const getSystemTokenList = withAuth(async (session: Session) => {
    if (!session.user?.id) {
        return { success: false, error: '用户ID不存在' };
    }

    const tokens = await prisma.systemToken.findMany({
        where: {
            userId: session.user.id,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    return { success: true, data: tokens };
});

/**
 * 创建系统令牌
 */
export const createSystemToken = withAuth(async (session: Session, params: { name: string }) => {
    if (!session.user?.id) {
        return { success: false, error: '用户ID不存在' };
    }

    const token = await prisma.systemToken.create({
        data: {
            name: params.name,
            token: Math.random().toString(36).substring(2),
            userId: session.user.id,
        },
    });

    revalidatePath('/user-settings');
    return { success: true, data: token };
});

/**
 * 删除系统令牌
 */
export const removeSystemToken = withAuth(async (session: Session, token: string) => {
    await prisma.systemToken.delete({
        where: {
            id: token,
        },
    });

    revalidatePath('/user-settings');
    return { success: true };
});

/**
 * 获取 Langfuse 配置
 */
export const getLangfuseConfig = withAuth(async (session: Session) => {
    if (!session.user?.id) {
        return { success: false, error: '用户ID不存在' };
    }

    const config = await prisma.langfuseConfig.findFirst({
        where: {
            userId: session.user.id,
        },
    });

    return { success: true, data: config };
});

/**
 * 设置 Langfuse 配置
 */
export const setLangfuseConfig = withAuth(async (session: Session, params: {
    publicKey: string;
    secretKey: string;
    host: string;
}) => {
    if (!session.user?.id) {
        return { success: false, error: '用户ID不存在' };
    }

    const config = await prisma.langfuseConfig.upsert({
        where: {
            userId: session.user.id,
        },
        create: {
            ...params,
            userId: session.user.id,
        },
        update: params,
    });

    revalidatePath('/user-settings');
    return { success: true, data: config };
});

/**
 * 删除 Langfuse 配置
 */
export const deleteLangfuseConfig = withAuth(async (session: Session) => {
    if (!session.user?.id) {
        return { success: false, error: '用户ID不存在' };
    }

    await prisma.langfuseConfig.delete({
        where: {
            userId: session.user.id,
        },
    });

    revalidatePath('/user-settings');
    return { success: true };
});
