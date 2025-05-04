import React, { useState, useEffect } from 'react';
import { MessageType } from '@/constants/chat';

interface MessageStreamHandlerProps {
    streamingId: string | null;
    dialogId: string;
}

export const MessageStreamHandler: React.FC<MessageStreamHandlerProps> = ({ streamingId, dialogId }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [reasoningContent, setReasoningContent] = useState('');
    const [isProcessingReasoning, setIsProcessingReasoning] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const MAX_RETRY = 3;
    const RETRY_INTERVAL = 2000; // 2秒后重试

    useEffect(() => {
        // 重置状态
        setStreamingContent('');
        setReasoningContent('');
        setIsProcessingReasoning(false);
        setRetryCount(0);

        if (!streamingId || !dialogId) {
            setIsConnected(false);
            return;
        }

        let eventSource: EventSource | null = null;
        let retryTimeoutId: NodeJS.Timeout | null = null;

        // 创建SSE连接函数
        const createConnection = () => {
            // 清理旧连接
            if (eventSource) {
                eventSource.close();
            }

            // 创建新SSE连接
            eventSource = new EventSource(`/api/chat/stream?dialogId=${dialogId}&messageId=${streamingId}`);
            setIsConnected(true);

            eventSource.onopen = () => {
                console.log('🌊 SSE连接已建立', { dialogId, streamingId, retryAttempt: retryCount });
                setIsConnected(true);
                // 重置重试计数
                setRetryCount(0);
            };

            eventSource.onerror = (error) => {
                console.error('🔥 SSE连接错误', error);

                // 关闭当前连接
                if (eventSource) {
                    eventSource.close();
                }

                setIsConnected(false);

                // 重试逻辑
                if (retryCount < MAX_RETRY) {
                    console.log(`⏱️ 尝试重新连接 (${retryCount + 1}/${MAX_RETRY})...`);
                    // 增加重试次数
                    setRetryCount(prev => prev + 1);

                    // 设置重试计时器
                    retryTimeoutId = setTimeout(createConnection, RETRY_INTERVAL);
                } else {
                    console.error(`❌ 已达到最大重试次数 (${MAX_RETRY})，停止尝试连接`);
                }
            };

            eventSource.addEventListener('message', (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // 处理不同类型的消息
                    if (data.type === 'reasoning') {
                        // 思维链内容
                        setIsProcessingReasoning(true);
                        setReasoningContent(prev => prev + data.chunk);
                    }
                    else if (data.type === 'content') {
                        // 最终答案内容
                        setIsProcessingReasoning(false);
                        setStreamingContent(prev => prev + data.chunk);
                    }
                    else if (data.type === 'transition') {
                        // 从思维链到最终答案的过渡
                        setIsProcessingReasoning(false);
                    }
                    else if (data.chunk) {
                        // 兼容旧格式
                        setStreamingContent(prev => prev + data.chunk);
                    }

                    // 检查是否完成
                    if (data.done) {
                        console.log('✅ 流式传输完成', {
                            contentLength: data.contentLength,
                            reasoningLength: data.reasoningLength,
                            hasReasoning: data.hasReasoning
                        });
                        if (eventSource) {
                            eventSource.close();
                        }
                        setIsConnected(false);

                        // 将内容存储为JSON格式供组件使用
                        if (data.hasReasoning) {
                            // 创建带有reasoningContent的完整消息对象
                            const message = {
                                id: streamingId,
                                content: JSON.stringify({
                                    content: streamingContent,
                                    reasoningContent: reasoningContent
                                }),
                                role: MessageType.ReasonReply
                            };

                            // 存储到本地，供ThinkingModeMessage组件使用
                            localStorage.setItem(`message_${streamingId}`, JSON.stringify(message));
                        }
                    }
                } catch (e) {
                    console.error('🔥 解析SSE消息出错', e);
                }
            });
        };

        // 初始化连接
        createConnection();

        // 清理函数
        return () => {
            console.log('🧹 清理SSE连接和重试计时器');
            if (eventSource) {
                eventSource.close();
            }
            if (retryTimeoutId) {
                clearTimeout(retryTimeoutId);
            }
            setIsConnected(false);
        };
    }, [streamingId, dialogId]);

    // 该组件不渲染任何内容，仅处理流式数据
    return null;
}; 