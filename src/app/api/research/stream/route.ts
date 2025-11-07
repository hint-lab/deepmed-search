// src/app/api/research/stream/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createNewRedisClient } from '@/lib/redis-client';
import { checkTaskActive, getTokenTrackerState, getActionTrackerState, TrackerEvent } from '@/lib/deep-research/tracker-store'; // 导入 TrackerEvent
import type { Redis } from 'ioredis';
import { TokenUsage } from '@/lib/deep-research/types';
import { ActionState } from '@/lib/deep-research/utils/action-tracker';

export async function GET(req: NextRequest) {
    const taskId = req.nextUrl.searchParams.get('taskId');
    if (!taskId) {
        return new NextResponse('Missing taskId parameter', { status: 400 });
    }

    // 检查任务是否活跃
    const isActive = await checkTaskActive(taskId);
    if (!isActive) {
        return new NextResponse('Task not found or inactive', { status: 404 });
    }

    // 创建新的 Redis 客户端用于订阅
    const redis = createNewRedisClient();
    const subscriber = redis.duplicate();

    // 修改通道名以匹配实际的键名格式
    const channel = `tracker:action:${taskId}`;

    // 设置响应头
    const headers = new Headers();
    headers.set('Content-Type', 'text/event-stream');
    headers.set('Cache-Control', 'no-cache');
    headers.set('Connection', 'keep-alive');

    const stream = new ReadableStream({
        async start(controller) {
            console.log(`[SSE ${taskId}] Attempting to create Redis subscriber...`);

            try {
                // 订阅 Redis 通道
                await subscriber.subscribe(channel);
                console.log(`[SSE ${taskId}] Subscribed to Redis channel: ${channel}`);

                // 立即获取并发送当前状态
                try {
                    const [tokenState, actionState] = await Promise.all([
                        getTokenTrackerState(taskId),
                        getActionTrackerState(taskId)
                    ]);

                    // 发送 token 状态
                    if (tokenState) {
                        const tokenStateData = `event: tokenState\ndata: ${JSON.stringify(tokenState)}\n\n`;
                        controller.enqueue(new TextEncoder().encode(tokenStateData));
                    }

                    // 发送 action 状态
                    if (actionState) {
                        const actionStateData = `event: actionState\ndata: ${JSON.stringify(actionState)}\n\n`;
                        controller.enqueue(new TextEncoder().encode(actionStateData));
                    }
                } catch (stateError) {
                    console.error(`[SSE ${taskId}] Error fetching initial states:`, stateError);
                }

                // 监听 Redis 消息
                subscriber.on('message', async (ch, message) => {
                    if (ch === channel) {
                        console.log(`[SSE ${taskId}] Received message on channel ${channel}:`, message);
                        try {
                            const event: TrackerEvent = JSON.parse(message);

                            // 处理事件
                            let originalEventData = '';
                            let shouldCloseController = false;

                            switch (event.type) {
                                case 'think':
                                    originalEventData = `data: ${JSON.stringify({ think: event.payload })}\n\n`;
                                    break;
                                case 'error':
                                    originalEventData = `data: ${JSON.stringify({ error: event.payload })}\n\n`;
                                    break;
                                case 'complete':
                                    originalEventData = `data: ${JSON.stringify({ complete: event.payload })}\n\n`;
                                    shouldCloseController = true;
                                    break;
                                case 'result':
                                    originalEventData = `event: result\ndata: ${event.payload}\n\n`;
                                    console.log(`[SSE ${taskId}] Sending result event:`, event.payload);
                                    break;
                                case 'questionEvaluation':
                                    originalEventData = `event: questionEvaluation\ndata: ${event.payload}\n\n`;
                                    console.log(`[SSE ${taskId}] Sending question evaluation event:`, event.payload);
                                    break;
                                case 'searchQuery':
                                    originalEventData = `event: searchQuery\ndata: ${event.payload}\n\n`;
                                    console.log(`[SSE ${taskId}] Sending search query event:`, event.payload);
                                    break;
                                case 'visitUrl':
                                    originalEventData = `event: visitUrl\ndata: ${event.payload}\n\n`;
                                    console.log(`[SSE ${taskId}] Sending visit URL event:`, event.payload);
                                    break;
                                case 'readContent':
                                    originalEventData = `event: readContent\ndata: ${event.payload}\n\n`;
                                    console.log(`[SSE ${taskId}] Sending read content event:`, event.payload);
                                    break;
                                default:
                                    console.warn(`[SSE ${taskId}] Received unknown event type:`, event.type);
                            }

                            // 发送事件数据
                            if (originalEventData) {
                                controller.enqueue(new TextEncoder().encode(originalEventData));
                            }

                            // 获取并发送最新状态
                            try {
                                const [tokenState, actionState] = await Promise.all([
                                    getTokenTrackerState(taskId),
                                    getActionTrackerState(taskId)
                                ]);

                                if (tokenState) {
                                    const tokenStateData = `event: tokenState\ndata: ${JSON.stringify(tokenState)}\n\n`;
                                    controller.enqueue(new TextEncoder().encode(tokenStateData));
                                }

                                if (actionState) {
                                    const actionStateData = `event: actionState\ndata: ${JSON.stringify(actionState)}\n\n`;
                                    controller.enqueue(new TextEncoder().encode(actionStateData));
                                }
                            } catch (stateError) {
                                console.error(`[SSE ${taskId}] Error fetching states after event:`, stateError);
                            }

                            // 如果需要关闭控制器，在发送完所有数据后关闭
                            if (shouldCloseController) {
                                controller.close();
                                console.log(`[SSE ${taskId}] Task completed, closing SSE stream.`);
                                return;
                            }
                        } catch (error) {
                            console.error(`[SSE ${taskId}] Error processing message:`, error);
                        }
                    }
                });

                // 错误处理
                subscriber.on('error', (error) => {
                    console.error(`[SSE ${taskId}] Redis subscriber error:`, error);
                    controller.close();
                });

            } catch (error) {
                console.error(`[SSE ${taskId}] Error setting up Redis subscriber:`, error);
                controller.close();
            }
        },
        cancel() {
            console.log(`[SSE ${taskId}] Stream cancelled, cleaning up...`);
            subscriber.unsubscribe(channel).catch(console.error);
            subscriber.quit().catch(console.error);
            redis.quit().catch(console.error);
        }
    });

    return new NextResponse(stream, { headers });
}

