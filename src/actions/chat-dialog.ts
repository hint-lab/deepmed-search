'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { withAuth } from '@/lib/auth-utils';
import { APIResponse } from '@/types/api';

/**
 * 获取对话列表
 */
export const getChatDialogListAction = withAuth(async (session): Promise<APIResponse<any>> => {
    const dialogs = await prisma.dialog.findMany({
        where: {
            userId: session.user.id,
        },
        orderBy: {
            update_date: 'desc',
        },
    });

    return { success: true, data: dialogs };
});

/**
 * 创建对话
 */
export const createChatDialogAction = withAuth(async (session, data: {
    name: string;
    description?: string;
    knowledgeBaseId?: string;
}): Promise<APIResponse<any>> => {
    try {
        console.log('Creating dialog with session:', {
            userId: session?.user?.id,
            email: session?.user?.email,
            name: data.name,
            knowledgeBaseId: data.knowledgeBaseId
        });

        if (!session?.user?.id) {
            console.error('User ID not found in session');
            return {
                success: false,
                error: '用户ID不存在'
            };
        }

        // 验证用户是否存在
        const user = await prisma.user.findUnique({
            where: {
                id: session.user.id
            },
            select: {
                id: true,
                email: true,
                name: true
            }
        });

        console.log('User lookup result:', user);

        if (!user) {
            console.error('User not found in database:', {
                userId: session.user.id,
                email: session.user.email
            });
            return {
                success: false,
                error: '用户不存在，请重新登录'
            };
        }

        // 如果提供了 knowledgeBaseId，验证知识库是否存在
        if (data.knowledgeBaseId) {
            const knowledgeBase = await prisma.knowledgeBase.findUnique({
                where: {
                    id: data.knowledgeBaseId
                }
            });

            if (!knowledgeBase) {
                console.error('Knowledge base not found:', data.knowledgeBaseId);
                return {
                    success: false,
                    error: '知识库不存在'
                };
            }
        }

        const dialog = await prisma.dialog.create({
            data: {
                name: data.name,
                description: data.description || '',
                userId: session.user.id,
                knowledgeBaseId: data.knowledgeBaseId
            },
        });

        console.log('Dialog created successfully:', {
            dialogId: dialog.id,
            userId: dialog.userId,
            knowledgeBaseId: dialog.knowledgeBaseId
        });

        return { success: true, data: dialog };
    } catch (error) {
        console.error('Error creating dialog:', {
            error,
            session: {
                userId: session?.user?.id,
                email: session?.user?.email
            },
            data
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : '创建对话失败'
        };
    }
});

/**
 * 更新对话
 */
export const updateChatDialogAction = withAuth(async (session, id: string, data: {
    name?: string;
    description?: string;
}): Promise<APIResponse<any>> => {
    const dialog = await prisma.dialog.update({
        where: {
            id,
            userId: session.user.id,
        },
        data,
    });
    return { success: true, data: dialog };
});

/**
 * 删除对话
 */
export const deleteChatDialogAction = withAuth(async (session, id: string): Promise<APIResponse<any>> => {
    try {
        // 首先检查对话是否存在
        const existingDialog = await prisma.dialog.findFirst({
            where: {
                id,
                userId: session.user.id,
            },
        });

        if (!existingDialog) {
            return {
                success: false,
                error: 'Dialog not found'
            };
        }

        // 使用事务确保数据一致性
        const result = await prisma.$transaction(async (tx) => {
            // 先删除所有相关消息
            await tx.message.deleteMany({
                where: {
                    dialogId: id,
                    dialog: {
                        userId: session.user.id
                    }
                }
            });

            // 然后删除对话
            const dialog = await tx.dialog.delete({
                where: {
                    id,
                    userId: session.user.id,
                }
            });

            return dialog;
        });

        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Failed to delete dialog:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete dialog'
        };
    }
});
