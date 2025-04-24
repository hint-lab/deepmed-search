// File: app/api/chat/stream/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getChatMessageStreamAction } from '@/actions/chat';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        // 获取请求体
        const { dialogId, content, userId, knowledgeBaseId } = await req.json();
        console.log('API Route: 获取请求体:', { dialogId, content, userId, knowledgeBaseId });

        if (!dialogId || typeof dialogId !== 'string' || !content || typeof content !== 'string' || !userId) {
            return NextResponse.json({ error: '请求参数不完整' }, { status: 400 });
        }

        // 获取会话信息
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: '未授权访问' }, { status: 401 });
        }

        // 设置 SSE Stream
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                // 发送 SSE 事件辅助函数
                function sendEvent(data: any) {
                    const eventString = `data: ${JSON.stringify(data)}\n\n`;
                    controller.enqueue(encoder.encode(eventString));
                }

                try {
                    if (knowledgeBaseId) {
                        console.log('API Route:使用知识库ID:', knowledgeBaseId);

                    }
                    // 调用 server action 处理流式消息
                    const response = await getChatMessageStreamAction(
                        dialogId,
                        content,
                        (chunk: string) => {
                            if (chunk) {
                                sendEvent({ chunk });
                            }
                        },
                        knowledgeBaseId
                    );

                    if (!response.success) {
                        throw new Error(response.error);
                    }

                    // 发送完成事件
                    sendEvent({
                        done: true,
                        messageId: response.data.messageId,
                        contentLength: response.data.content.length
                    });

                    // 添加一个小延迟，确保客户端有时间处理最后的事件
                    await new Promise(resolve => setTimeout(resolve, 100));

                } catch (error) {
                    console.error('API Route: 流处理出错:', error);
                    sendEvent({ error: '流处理失败: ' + (error instanceof Error ? error.message : String(error)) });
                } finally {
                    try {
                        console.log('API Route: 关闭 SSE 流');
                        controller.close();
                    } catch (closeError) {
                        console.error('API Route: 关闭流时出错:', closeError);
                    }
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