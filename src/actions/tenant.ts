'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { withAuth } from '@/lib/auth-utils';

/**
 * 获取租户信息
 */
export const getTenantInfo = withAuth(async (session) => {
    const user = await prisma.user.findUnique({
        where: { email: session.user.email as string },
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
 * 添加租户用户
 */
export const addTenantUser = withAuth(async (session, { tenantId, email }: { tenantId: string; email: string }) => {
    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        return { success: false, error: '用户已存在' };
    }

    // 创建新用户
    const user = await prisma.user.create({
        data: {
            email,
            name: email.split('@')[0],
            password: '', // 需要用户自行设置密码
            tenantId,
            language: 'zh',
        },
    });

    revalidatePath('/tenant/users');
    return { success: true, data: user };
});

/**
 * 删除租户用户
 */
export const deleteTenantUser = withAuth(async (session, { tenantId, userId }: { tenantId: string; userId: string }) => {
    await prisma.user.delete({
        where: { id: userId },
    });

    revalidatePath('/tenant/users');
    return { success: true };
});

/**
 * 获取租户用户列表
 */
export const listTenantUsers = withAuth(async (session, tenantId: string) => {
    const users = await prisma.user.findMany({
        where: { tenantId },
        select: {
            id: true,
            email: true,
            name: true,
            language: true,
            createdAt: true,
        },
    });

    return { success: true, data: users };
});

/**
 * 获取租户列表
 */
export const listTenant = withAuth(async (session) => {
    const tenants = await prisma.tenant.findMany({
        orderBy: {
            createdAt: 'desc',
        },
    });

    return { success: true, data: tenants };
});

/**
 * 同意租户邀请
 */
export const agreeTenant = withAuth(async (session, tenantId: string) => {
    const user = await prisma.user.update({
        where: { email: session.user.email as string },
        data: { tenantId },
        include: {
            tenant: true,
        },
    });

    revalidatePath('/tenant');
    return { success: true, data: user };
}); 