'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { withAuth } from '@/lib/auth-utils';
import { APIResponse } from '@/types/api';
import { chatClient } from '@/lib/openai/chat/client';
import { IMessage } from '@/types/message';
import { MessageType } from '@/constants/chat';



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

        revalidatePath('/chat');
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

    revalidatePath('/chat');
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

        // 在事务成功完成后调用 revalidatePath
        revalidatePath('/chat');
        revalidatePath('/chat/[id]', 'page');

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

/**
 * 获取对话消息
 */
export const fetchChatMessagesAction = withAuth(async (session, dialogId: string): Promise<APIResponse<any>> => {
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
export const deleteChatMessageAction = withAuth(async (session, messageId: string): Promise<APIResponse<any>> => {
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
 * 发送消息 (非流式响应)
 */
export const sendChatMessageAction = withAuth(async (session, dialogId: string, content: string): Promise<APIResponse<any>> => {
    try {
        console.log('开始发送消息 (非流式):', { dialogId, content });

        // 创建用户消息
        const userMessage = await prisma.message.create({
            data: {
                content,
                role: MessageType.User,
                dialogId,
                userId: session.user.id,
            },
        });

        console.log('用户消息创建成功:', { messageId: userMessage.id });

        // 获取对话信息
        const dialog = await prisma.dialog.findUnique({
            where: { id: dialogId },
            include: {
                knowledgeBase: true
            }
        });

        if (!dialog) {
            throw new Error('对话不存在');
        }

        console.log('获取对话信息成功:', { dialogId });

        // 设置系统提示词
        chatClient.setSystemPrompt(
            dialogId,
            dialog.knowledgeBase
                ? `你是一个专业的AI助手。请基于以下知识库回答问题：${dialog.knowledgeBase.name}`
                : '你是一个专业的AI助手。'
        );

        // 使用 chatClient 处理非流式输出
        const response = await chatClient.chat(dialogId, content);

        // 创建助手消息
        const assistantMessage = await prisma.message.create({
            data: {
                content: response.content,
                role: MessageType.Assistant,
                dialogId,
                userId: session.user.id,
            },
        });

        console.log('助手消息创建成功:', { messageId: assistantMessage.id });
        revalidatePath(`/chat/${dialogId}`);

        return {
            success: true,
            data: {
                messageId: assistantMessage.id,
                content: response.content
            }
        };

    } catch (error) {
        console.error('处理消息失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '处理消息失败'
        };
    }
});

/**
 * 发送消息 (流式响应)
 */
export const sendChatMessageStreamAction = withAuth(async (session, dialogId: string, content: string, onChunk: (chunk: string) => void): Promise<APIResponse<any>> => {
    try {
        console.log('开始发送消息 (流式):', { dialogId, content });

        // 创建用户消息
        const userMessage = await prisma.message.create({
            data: {
                content,
                role: MessageType.User,
                dialogId,
                userId: session.user.id,
            },
        });

        console.log('用户消息创建成功:', { messageId: userMessage.id });

        // 获取对话信息
        const dialog = await prisma.dialog.findUnique({
            where: { id: dialogId },
            include: {
                knowledgeBase: true
            }
        });

        if (!dialog) {
            throw new Error('对话不存在');
        }

        console.log('获取对话信息成功:', { dialogId });

        // 设置系统提示词
        chatClient.setSystemPrompt(
            dialogId,
            dialog.knowledgeBase
                ? `你是一个专业的AI助手。请基于以下知识库回答问题：${dialog.knowledgeBase.name}`
                : '你是一个专业的AI助手。'
        );

        // 创建临时的空助手消息 (用于后续更新)
        let assistantMessage = await prisma.message.create({
            data: {
                content: '', // 初始为空
                role: MessageType.Assistant,
                dialogId,
                userId: session.user.id,
            },
        });

        console.log('临时助手消息创建成功:', { messageId: assistantMessage.id });

        let accumulatedContent = '';

        // 使用 chatClient 处理流式输出
        await chatClient.chatStream(dialogId, content, (chunk: string) => {
            if (chunk) {
                accumulatedContent += chunk;
                onChunk(chunk);
            }
        });

        // 流处理结束后，更新数据库中的完整内容
        console.log('流处理完成，更新数据库:', {
            messageId: assistantMessage.id,
            contentLength: accumulatedContent.length,
            contentPreview: accumulatedContent.substring(0, 100) + '...'
        });

        await prisma.message.update({
            where: { id: assistantMessage.id },
            data: {
                content: accumulatedContent,
            },
        });

        // 更新对话的最后更新时间
        await prisma.dialog.update({
            where: { id: dialogId },
            data: {
                update_date: new Date(),
            },
        });

        console.log('数据库更新成功');
        revalidatePath(`/chat/${dialogId}`);

        return {
            success: true,
            data: {
                messageId: assistantMessage.id,
                content: accumulatedContent
            }
        };

    } catch (error) {
        console.error('处理流式消息失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '处理流式消息失败'
        };
    }
});

export const getRelatedQuestionsAction = withAuth(async (session, dialogId: string): Promise<APIResponse<any>> => {
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
export const createRelatedQuestionAction = withAuth(async (session, dialogId: string, question: string): Promise<APIResponse<any>> => {
    const relatedQuestion = await prisma.relatedQuestion.create({
        data: {
            question,
            dialogId,
        },
    });

    revalidatePath(`/chat/${dialogId}`);
    return { success: true, data: relatedQuestion };
}); 