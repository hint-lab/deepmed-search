'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { withAuth } from '@/lib/auth-utils';

/**
 * 获取对话列表
 */
export const getChatDialogList = withAuth(async (session) => {
    const dialogs = await prisma.dialog.findMany({
        where: {
            userId: session.user.id,
        },
        orderBy: {
            updatedAt: 'desc',
        },
    });

    return { success: true, data: dialogs };
});

/**
 * 创建对话
 */
export const createChatDialog = withAuth(async (session, data: {
    name: string;
    description?: string;
}) => {
    const dialog = await prisma.dialog.create({
        data: {
            name: data.name,
            description: data.description,
            userId: session.user.id,
        },
    });

    revalidatePath('/chat');
    return { success: true, data: dialog };
});

/**
 * 更新对话
 */
export const updateChatDialog = withAuth(async (session, id: string, data: {
    name?: string;
    description?: string;
}) => {
    const dialog = await prisma.dialog.update({
        where: {
            id,
            userId: session.user.id,
        },
        data,
    });

    revalidatePath('/chat');
    return { success: true, data: dialog };
});

/**
 * 删除对话
 */
export const deleteChatDialog = withAuth(async (session, id: string) => {
    await prisma.dialog.delete({
        where: {
            id,
            userId: session.user.id,
        },
    });

    revalidatePath('/chat');
    return { success: true };
});

/**
 * 获取对话消息
 */
export const getChatConversation = withAuth(async (session, dialogId: string) => {
    const messages = await prisma.message.findMany({
        where: {
            dialogId,
            userId: session.user.id,
        },
        orderBy: {
            createdAt: 'asc',
        },
    });

    return { success: true, data: messages };
});



/**
 * 删除消息
 */
export const deleteChatMessage = withAuth(async (session, messageId: string) => {
    await prisma.message.delete({
        where: {
            id: messageId,
            userId: session.user.id,
        },
    });

    revalidatePath('/chat');
    return { success: true };
});


/**
 * 发送消息
 */
export const sendChatMessage = withAuth(async (session, dialogId: string, content: string) => {
    const message = await prisma.message.create({
        data: {
            content,
            role: 'user',
            dialogId,
            userId: session.user.id,
        },
    });

    revalidatePath(`/chat/${dialogId}`);

    const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            dialogId,
            content,
        }),
    });

    if (!response.ok) {
        throw new Error('发送消息失败');
    }

    const result = await response.json();
    return { success: true, data: result.data };
});

/**
 * 发送消息（SSE）
 */
export const sendChatMessageWithSSE = async (dialogId: string, content: string) => {
    try {
        revalidatePath(`/chat/${dialogId}`);
        const response = await fetch('/api/chat/message/sse', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                dialogId,
                content,
            }),
        });

        if (!response.ok) {
            throw new Error('发送消息失败');
        }

        const result = await response.json();
        return { success: true, data: result.data };
    } catch (error) {
        console.error('发送消息失败:', error);
        return { success: false, error: '发送消息失败' };
    }
};

export const getRelatedQuestions = withAuth(async (session, dialogId: string) => {
    const relatedQuestions = await prisma.relatedQuestion.findMany({
        where: {
            dialogId,
        },
    });

    return { success: true, data: relatedQuestions };
});

/**
 * 创建相关问题
 */
export const createRelatedQuestion = withAuth(async (session, dialogId: string, question: string) => {
    const relatedQuestion = await prisma.relatedQuestion.create({
        data: {
            question,
            dialogId,
        },
    });

    revalidatePath(`/chat/${dialogId}`);
    return { success: true, data: relatedQuestion };
}); 