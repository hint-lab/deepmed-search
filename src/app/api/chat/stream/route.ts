// File: app/api/chat/stream/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { agentManager } from '@/lib/agent-manager';
import { MessageType } from '@/constants/chat';
import { Message as PrismaMessage } from '@prisma/client';

type DatabaseMessage = {
    id: string;
    content: string;
    role: MessageType;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    dialogId: string;
};

export async function POST(req: NextRequest) {
    try {
        // 获取请求体
        const { dialogId, content, userId } = await req.json();

        if (!dialogId || typeof dialogId !== 'string' || !content || typeof content !== 'string' || !userId) {
            return NextResponse.json({ error: '请求参数不完整' }, { status: 400 });
        }

        console.log('API Route: 开始处理流式消息:', { dialogId, content, userId });

        // 1. 创建用户消息
        const userMessage = await prisma.message.create({
            data: {
                content,
                role: MessageType.User,
                dialogId,
                userId,
            },
        }) as unknown as DatabaseMessage;
        console.log('API Route: 用户消息创建成功:', { messageId: userMessage.id });

        // 2. 获取对话信息
        const dialog = await prisma.dialog.findUnique({
            where: { id: dialogId, userId }, // 确保用户拥有该对话
            include: {
                knowledgeBase: true
            }
        });

        if (!dialog) {
            console.error('API Route: 对话不存在或用户无权访问', { dialogId, userId });
            return NextResponse.json({ error: '对话不存在或无权访问' }, { status: 404 });
        }
        console.log('API Route: 获取对话信息成功:', { dialogId });

        // 3. 获取或创建 agent
        const agent = agentManager.getAgent(dialogId, dialog.knowledgeBase);
        console.log('API Route: Agent 获取成功');

        // 4. 创建临时的空助手消息 (用于后续更新)
        let assistantMessage = await prisma.message.create({
            data: {
                content: '', // 初始为空
                role: MessageType.Assistant,
                dialogId,
                userId, // 与用户关联
            },
        }) as unknown as DatabaseMessage;
        console.log('API Route: 临时助手消息创建成功:', { messageId: assistantMessage.id });

        // 5. 设置 SSE Stream
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                let accumulatedContent = '';

                // 发送 SSE 事件辅助函数
                function sendEvent(data: any) {
                    const eventString = `data: ${JSON.stringify(data)}\n\n`;
                    controller.enqueue(encoder.encode(eventString));
                }

                try {
                    // 处理 agent 流式输出
                    await agent.processWithStream(content, async (chunk: string) => {
                        if (chunk) {
                            accumulatedContent += chunk;

                            // 发送数据块到客户端
                            sendEvent({ chunk });

                            // 每次收到数据时添加一个小延迟，确保流畅传输
                            await new Promise(resolve => setTimeout(resolve, 10));
                        }
                    });

                    // 流处理结束后，确保数据库中保存了完整内容
                    console.log('API Route: 流处理完成，更新数据库:', {
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
                    console.log('API Route: 数据库更新成功');

                    // 发送完成事件 - 确保这是最后一个事件
                    sendEvent({
                        done: true,
                        messageId: assistantMessage.id,
                        contentLength: accumulatedContent.length
                    });

                    // 添加一个小延迟，确保客户端有时间处理最后的事件
                    await new Promise(resolve => setTimeout(resolve, 100));

                } catch (error) {
                    console.error('API Route: 流处理或数据库更新出错:', error);

                    // 发送错误事件
                    sendEvent({ error: '流处理失败: ' + (error instanceof Error ? error.message : String(error)) });

                    // 尝试更新错误信息到数据库
                    await prisma.message.update({
                        where: { id: assistantMessage.id },
                        data: { content: '[处理过程中出错] ' + (error instanceof Error ? error.message : String(error)) },
                    }).catch(dbError => console.error("API Route: 更新错误信息到数据库失败", dbError));

                } finally {
                    // 确保控制器正确关闭，即使在出现错误的情况下
                    try {
                        console.log('API Route: 关闭 SSE 流');
                        controller.close();
                    } catch (closeError) {
                        console.error('API Route: 关闭流时出错:', closeError);
                    }
                }
            },
            cancel() {
                console.log('API Route: SSE Stream 被客户端取消。');
                // 尝试清理资源
                try {
                    agentManager.removeAgent(dialogId);
                } catch (error) {
                    console.error('API Route: 清理 agent 资源失败:', error);
                }
            }
        });

        // 返回 SSE 响应
        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no' // 禁用 Nginx 缓冲
            },
        });

    } catch (error) {
        console.error('API Route: 处理 /api/chat/stream 失败:', { error });
        return NextResponse.json({ error: '服务器内部错误: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 });
    }
}