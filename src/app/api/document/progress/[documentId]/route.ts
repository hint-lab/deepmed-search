/**
 * 文档处理进度 SSE 端点
 * 前端可以通过 EventSource 订阅文档处理的实时进度
 */

import { NextRequest, NextResponse } from 'next/server';
import { subscribeDocumentProgress, type DocumentProgressEvent } from '@/lib/document-tracker';
import logger from '@/utils/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ documentId: string }> }
) {
    // Next.js 15 要求 await params
    const { documentId } = await params;

    if (!documentId) {
        return NextResponse.json(
            { error: '缺少 documentId 参数' },
            { status: 400 }
        );
    }

    logger.info('[Document Progress SSE] 新的订阅请求', {
        documentId,
    });

    const headers = new Headers();
    headers.set('Content-Type', 'text/event-stream');
    headers.set('Cache-Control', 'no-cache, no-transform');
    headers.set('Connection', 'keep-alive');
    headers.set('X-Accel-Buffering', 'no');

    let heartbeatTimer: NodeJS.Timeout | null = null;
    let unsubscribe: (() => void) | null = null;
    let closeTimer: NodeJS.Timeout | null = null;
    let isClosed = false;

    const stream = new ReadableStream({
        async start(controller) {
            try {
                // 发送初始连接确认
                controller.enqueue(
                    new TextEncoder().encode(`retry: 5000\n\n`)
                );
                controller.enqueue(
                    new TextEncoder().encode(`: ping ${Date.now()}\n\n`)
                );

                // 订阅 Redis 进度更新
                unsubscribe = await subscribeDocumentProgress(
                    documentId,
                    (event: DocumentProgressEvent) => {
                        try {
                            // 如果连接已关闭，不再处理事件
                            if (isClosed) {
                                return;
                            }

                            const data = {
                                type: event.type,
                                ...event.data,
                                timestamp: event.timestamp,
                            };

                            controller.enqueue(
                                new TextEncoder().encode(
                                    `event: ${event.type}\ndata: ${JSON.stringify(data)}\n\n`
                                )
                            );

                            logger.info('[Document Progress SSE] 发送事件', {
                                documentId,
                                type: event.type,
                            });

                            // 如果是完成或错误事件，延迟关闭连接
                            if (event.type === 'complete' || event.type === 'error') {
                                // 清除之前的关闭定时器（如果存在）
                                if (closeTimer) {
                                    clearTimeout(closeTimer);
                                }

                                closeTimer = setTimeout(() => {
                                    if (!isClosed) {
                                        isClosed = true;
                                        try {
                                            controller.close();
                                        } catch (error) {
                                            // 忽略已关闭的错误
                                            logger.info('[Document Progress SSE] Controller 已关闭', {
                                                documentId,
                                            });
                                        }
                                    }
                                }, 1000);
                            }
                        } catch (error) {
                            // 如果 controller 已关闭，这是正常现象
                            if (error instanceof Error && error.message.includes('closed')) {
                                logger.info('[Document Progress SSE] Controller 已关闭，停止发送事件', {
                                    documentId,
                                });
                                isClosed = true;
                                return;
                            }

                            logger.error('[Document Progress SSE] 发送事件失败', {
                                documentId,
                                error: error instanceof Error ? error.message : '未知错误',
                            });
                        }
                    }
                );

                logger.info('[Document Progress SSE] 订阅成功', {
                    documentId,
                });

                // 设置心跳，保持连接
                heartbeatTimer = setInterval(() => {
                    if (isClosed) {
                        clearInterval(heartbeatTimer!);
                        return;
                    }

                    try {
                        controller.enqueue(
                            new TextEncoder().encode(`: heartbeat ${Date.now()}\n\n`)
                        );
                    } catch (error) {
                        // 客户端断开连接时会触发此错误，这是正常现象
                        logger.info('[Document Progress SSE] 客户端已断开连接，停止心跳', {
                            documentId,
                        });
                        isClosed = true;
                        clearInterval(heartbeatTimer!);
                    }
                }, 30000); // 每30秒发送一次心跳
            } catch (error) {
                logger.error('[Document Progress SSE] 订阅失败', {
                    documentId,
                    error: error instanceof Error ? error.message : '未知错误',
                });

                try {
                    controller.enqueue(
                        new TextEncoder().encode(
                            `event: error\ndata: ${JSON.stringify({
                                error: '订阅失败',
                            })}\n\n`
                        )
                    );
                } catch (enqueueError) {
                    // 如果无法发送错误消息，连接可能已关闭
                    logger.info('[Document Progress SSE] 无法发送错误消息，连接可能已关闭', {
                        documentId,
                    });
                }

                if (!isClosed) {
                    isClosed = true;
                    try {
                        controller.close();
                    } catch (closeError) {
                        // 忽略已关闭的错误
                        logger.info('[Document Progress SSE] Controller 已关闭', {
                            documentId,
                        });
                    }
                }
            }
        },

        cancel() {
            logger.info('[Document Progress SSE] 连接关闭', {
                documentId,
            });

            // 标记为已关闭
            isClosed = true;

            // 清理资源
            if (heartbeatTimer) {
                clearInterval(heartbeatTimer);
                heartbeatTimer = null;
            }

            if (closeTimer) {
                clearTimeout(closeTimer);
                closeTimer = null;
            }

            if (unsubscribe) {
                unsubscribe();
                unsubscribe = null;
            }
        },
    });

    return new Response(stream, { headers });
}

