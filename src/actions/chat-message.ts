'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { withAuth } from '@/lib/auth-utils';
import { APIResponse } from '@/types/api';
import { chatClient } from '@/lib/deepseek/chat/client';
import { kbReferenceTool } from '@/lib/deepseek/chat/tools';
import { IMessage } from '@/types/message';
import { MessageType } from '@/constants/chat';
import { searchSimilarChunks } from '@/lib/pgvector/operations';
import { getEmbeddings } from '@/lib/openai/embedding';
import { auth } from '@/lib/auth';
import { ChunkResponse } from '@/lib/deepseek';

interface ReferenceData {
    type: string;
    reference_id: number;
    doc_id: string;
    doc_name: string;
    content: string;
    // 添加其他你可能需要的属性
}


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
            thinkingContent: msg.thinkingContent || undefined,
            metadata: msg.metadata ?? undefined
        })) as any;

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
    isReason: boolean = false
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
        const systemPrompt = `
        你可以通过调用 kb_reference 工具来引用知识库片段。每当你需要引用知识库内容时，请调用该工具，并传递文档ID、片段ID和片段内容。
        `;
        chatClient.setSystemPrompt(dialogId, systemPrompt);

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
    isReason: boolean = false,
    isUsingKB: boolean = false,
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
                        (chunk: ChunkResponse) => {
                            if (typeof chunk === 'string') {
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
                            } else {
                                // 如果 chunk 是对象，可以在这里添加特定处理逻辑，例如函数调用相关的
                                console.log("Received object chunk:", chunk);
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
                    if (isUsingKB && dialog.knowledgeBase) {
                        try {
                            const queryVector = await getEmbeddings([content]);
                            const chunks = await searchSimilarChunks(queryVector[0], dialog.knowledgeBase.id, 5);

                            // 发送知识库片段信息给前端
                            sendEvent({
                                type: 'kb_chunks',
                                chunks: chunks.map((chunk: any) => ({
                                    content: chunk.content,
                                    doc_name: chunk.doc_name,
                                    distance: chunk.distance
                                }))
                            });

                            contextChunks = chunks.map((chunk: { content: string }) => chunk.content).join('\n\n---\n\n');

                            // 将知识库名称和片段存入消息元数据
                            if (assistantMessageId) {
                                await prisma.message.update({
                                    where: { id: assistantMessageId },
                                    data: {
                                        metadata: {
                                            kbName: dialog.knowledgeBase.name,
                                            kbChunks: chunks.map((chunk: any) => ({
                                                content: chunk.content,
                                                docName: chunk.doc_name,
                                                distance: chunk.distance
                                            }))
                                        }
                                    }
                                });
                            }
                        } catch (kbError) {
                            console.error("Error retrieving knowledge base context:", kbError);
                        }
                    }
                    chatClient.setTools([kbReferenceTool]);
                    chatClient.setSystemPrompt(
                        dialogId,
                        contextChunks
                            ? `你是一个专业的AI助手。请基于以下知识库内容回答问题：\n\n${contextChunks}\n\n请根据以下知识库片段回答问题，并在引用片段内容时用[1]、[2]等编号标注出处。例如："……[1]"。片段如下：
                            [1] 片段内容A
                            [2] 片段内容B`
                            : '你是一个专业的AI助手。'
                    );

                    let accumulatedContent = '';
                    let references: ReferenceData[] = [];

                    await chatClient.chatWithFunctionsStream(
                        dialogId,
                        content,
                        (chunk: ChunkResponse) => {
                            if (typeof chunk === 'string') {
                                accumulatedContent += chunk;
                                sendEvent({ type: 'content', chunk });
                            } else if (chunk.type === 'function_call') {
                                sendEvent({ type: 'tool_call_start', tool: chunk.name, args: chunk.arguments });
                            } else if (chunk.type === 'function_result') {
                                try {
                                    const refData = JSON.parse(chunk.content);
                                    if (refData.type === 'reference') {
                                        references.push(refData as ReferenceData);
                                        sendEvent({
                                            type: 'reference',
                                            ref_id: refData.reference_id,
                                            doc_id: refData.doc_id,
                                            doc_name: refData.doc_name,
                                            content: refData.content
                                        });

                                        accumulatedContent += `[${refData.reference_id}]`;
                                    }
                                } catch (e) {
                                    console.error('解析引用工具结果失败:', e);
                                    // 确保 chunk.content 是字符串，如果不是则进行转换或提供默认值
                                    const contentToAppend = typeof chunk.content === 'string' ? chunk.content : JSON.stringify(chunk.content);
                                    accumulatedContent += contentToAppend;
                                    sendEvent({ type: 'content', chunk: contentToAppend });
                                }
                            }
                        },
                        false
                    );

                    if (assistantMessageId) {
                        // 获取现有的元数据，以便合并
                        const existingMessage = await prisma.message.findUnique({
                            where: { id: assistantMessageId },
                            select: { metadata: true }
                        });
                        const existingMetadata = (existingMessage?.metadata as any) || {}; // 类型断言为 any 或更具体的类型

                        await prisma.message.update({
                            where: { id: assistantMessageId },
                            data: {
                                content: accumulatedContent,
                                metadata: {
                                    ...existingMetadata,
                                    references: references
                                }
                            },
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