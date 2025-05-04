'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { withAuth } from '@/lib/auth-utils';
import { APIResponse } from '@/types/api';
import { chatClient } from '@/lib/deepseek/chat/client';
import { IMessage } from '@/types/message';
import { MessageType } from '@/constants/chat';
import { searchSimilarChunks } from '@/lib/pgvector/operations';
import { getEmbeddings } from '@/lib/openai/embedding';
import { auth } from '@/lib/auth';


export const fetchChatMessagesAction = withAuth(async (
    session,
    dialogId: string
): Promise<APIResponse<IMessage[]>> => {
    try {
        const messages = await prisma.message.findMany({
            where: {
                dialogId,
                userId: session.user.id
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        console.log("fetchChatMessagesAction", messages)
        // 转换消息类型以匹配 IMessage 接口
        const formattedMessages: IMessage[] = messages.map(msg => ({
            ...msg,
            thinkingContent: msg.thinkingContent || undefined
        }));

        return {
            success: true,
            data: formattedMessages
        };
    } catch (error) {
        console.error('获取消息失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '获取消息失败'
        };
    }
});

/**
 * 记录消息
 */
export const sendChatMessageAction = withAuth(async (
    session,
    dialogId: string,
    content: string,
    isReason: boolean = false,
    knowledgeBaseId?: string
): Promise<APIResponse<any>> => {
    try {
        console.log('开始发送消息 (非流式):', { dialogId, content, isReason });

        // 创建用户消息
        const userMessage = await prisma.message.create({
            data: {
                content: isReason ? content : content,
                role: isReason ? MessageType.Reason : MessageType.User,
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

        // 如果是思考内容，使用思考模式处理
        if (isReason) {
            console.log('思考模式，生成AI思考回复');

            // 使用 chatClient 处理思考模式输出
            const response = await chatClient.chat(dialogId, content, true);

            console.log('思考模式，生成AI思考回复成功:', {
                response: response
            });
            // 将思考结果保存到数据库
            const assistantMessage = await prisma.message.create({
                data: {
                    content: response.content,
                    role: MessageType.ReasonReply,
                    dialogId,
                    userId: session.user.id,
                    // 直接保存思考过程文本
                    thinkingContent: response.metadata.reasoningContent ?? undefined,
                    isThinking: true
                },
            });


            revalidatePath(`/chat/${dialogId}`);
            return {
                success: true,
                data: {
                    messageId: assistantMessage.id,
                    content: response.content
                }
            };
        }

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



export async function getChatMessageStream(
    dialogId: string,
    content: string,
    userId: string,
    knowledgeBaseId?: string,
    isReason: boolean = false
) {
    let assistantMessageId: string | null = null;
    const encoder = new TextEncoder();
    let streamController: ReadableStreamDefaultController<any> | null = null;

    function sendEvent(data: any) {
        if (streamController) {
            const eventString = `data: ${JSON.stringify(data)}\n\n`;
            streamController.enqueue(encoder.encode(eventString));
        } else {
            console.error("Stream controller not available to send event:", data);
        }
    }

    const stream = new ReadableStream({
        async start(controller) {
            streamController = controller;

            try {
                // 验证会话和用户
                const session = await auth();
                if (!session || session.user.id !== userId) {
                    throw new Error('Unauthorized');
                }

                // 验证对话是否存在
                const dialog = await prisma.dialog.findUnique({
                    where: { id: dialogId, userId: session.user.id },
                    include: { knowledgeBase: true }
                });
                if (!dialog) {
                    throw new Error('Dialog not found or unauthorized');
                }

                // 创建用户消息
                const userMessage = await prisma.message.create({
                    data: {
                        content: content,
                        role: isReason ? MessageType.Reason : MessageType.User,
                        dialogId,
                        userId,
                    }
                });

                if (isReason) {
                    // 思考模式处理
                    const thinkingAssistantMessage = await prisma.message.create({
                        data: {
                            content: '',
                            role: MessageType.ReasonReply,
                            dialogId,
                            userId,
                            isThinking: true,
                        },
                    });
                    assistantMessageId = thinkingAssistantMessage.id;

                    sendEvent({ type: 'assistant_message_id', id: assistantMessageId });

                    let accumulatedContent = '';
                    let reasoningContent = '';
                    let currentlyProcessingReasoning = true;

                    await chatClient.chatStream(
                        dialogId,
                        content,
                        (chunk: string) => {
                            if (chunk) {
                                if (chunk.startsWith('[REASONING]')) {
                                    const reasoningChunk = chunk.substring('[REASONING]'.length);
                                    reasoningContent += reasoningChunk;
                                    sendEvent({ type: 'reasoning', chunk: reasoningChunk });
                                    currentlyProcessingReasoning = true;
                                } else if (chunk === '[END_REASONING][CONTENT]') {
                                    currentlyProcessingReasoning = false;
                                    sendEvent({ type: 'transition', message: '思维过程结束，开始输出结论:' });
                                } else {
                                    if (currentlyProcessingReasoning) {
                                        reasoningContent += chunk;
                                        sendEvent({ type: 'reasoning', chunk: chunk });
                                    } else {
                                        accumulatedContent += chunk;
                                        sendEvent({ type: 'content', chunk: chunk });
                                    }
                                }
                            }
                        },
                        true
                    );

                    if (assistantMessageId) {
                        await prisma.message.update({
                            where: { id: assistantMessageId },
                            data: {
                                content: accumulatedContent,
                                thinkingContent: reasoningContent,
                                isThinking: true,
                            },
                        });
                    }

                    sendEvent({
                        done: true,
                        messageId: assistantMessageId,
                        contentLength: accumulatedContent.length,
                        reasoningLength: reasoningContent.length,
                        hasReasoning: reasoningContent.length > 0
                    });

                } else {
                    // 普通模式处理
                    const normalAssistantMessage = await prisma.message.create({
                        data: {
                            content: '',
                            role: MessageType.Assistant,
                            dialogId,
                            userId,
                            isThinking: false,
                        },
                    });
                    assistantMessageId = normalAssistantMessage.id;

                    sendEvent({ type: 'assistant_message_id', id: assistantMessageId });

                    let contextChunks = '';
                    if (knowledgeBaseId && dialog.knowledgeBase) {
                        try {
                            const queryVector = await getEmbeddings([content]);
                            const chunks = await searchSimilarChunks(queryVector[0], knowledgeBaseId, 3);
                            contextChunks = chunks.map((chunk: { content: string }) => chunk.content).join('\n\n---\n\n');
                        } catch (kbError) {
                            console.error("Error retrieving knowledge base context:", kbError);
                        }
                    }

                    chatClient.setSystemPrompt(
                        dialogId,
                        contextChunks
                            ? `你是一个专业的AI助手。请基于以下知识库内容回答问题：\n\n${contextChunks}\n\n请仅使用上述知识库内容回答问题，如果知识库内容无法回答问题，请明确告知用户。`
                            : '你是一个专业的AI助手。'
                    );

                    let accumulatedContent = '';
                    await chatClient.chatStream(
                        dialogId,
                        content,
                        (chunk: string) => {
                            if (chunk) {
                                accumulatedContent += chunk;
                                sendEvent({ type: 'content', chunk: chunk });
                            }
                        },
                        false
                    );

                    if (assistantMessageId) {
                        await prisma.message.update({
                            where: { id: assistantMessageId },
                            data: { content: accumulatedContent },
                        });
                    }

                    sendEvent({
                        done: true,
                        messageId: assistantMessageId,
                        contentLength: accumulatedContent.length,
                        hasReasoning: false
                    });
                }

                // 更新对话时间
                await prisma.dialog.update({
                    where: { id: dialogId },
                    data: { update_date: new Date() },
                });

            } catch (error) {
                console.error('Stream processing error:', error);
                sendEvent({ error: '流处理失败: ' + (error instanceof Error ? error.message : String(error)) });
                if (assistantMessageId) {
                    try {
                        await prisma.message.update({
                            where: { id: assistantMessageId },
                            data: { content: `处理失败: ${error instanceof Error ? error.message : String(error)}` },
                        });
                    } catch (updateError) {
                        console.error('Failed to update message with error state:', updateError);
                    }
                }
            } finally {
                if (streamController) {
                    streamController.close();
                }
            }
        }
    });

    return stream;
} 