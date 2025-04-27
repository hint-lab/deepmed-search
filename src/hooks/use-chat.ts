'use client';

import { toast } from 'sonner';
import { useTranslate } from '@/contexts/language-context';
import { useState, useEffect, useRef } from 'react';
import {
    fetchChatMessagesAction,
    sendChatMessageAction,
    deleteChatMessageAction,
    getRelatedQuestionsAction
} from '@/actions/chat';
import { MessageType } from '@/constants/chat';
import { IMessage } from '@/types/message';


/**
 * 获取对话消息
 */
export function useChatMessages() {
    const [chatMessages, setChatMessages] = useState<IMessage[]>([]);
    const [isPending, setIsPending] = useState(false);

    const fetchChatMessages = async (dialogId: string) => {
        if (!dialogId) return;
        setIsPending(true);
        try {
            const result = await fetchChatMessagesAction(dialogId);
            if (result.success) {
                const formattedMessages = result.data.map((msg: any) => ({
                    ...msg,
                    role: msg.role as MessageType,
                    createdAt: new Date(msg.createdAt),
                }));
                setChatMessages(formattedMessages);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsPending(false);
        }
    };
    const sendMessage = async (dialogId: string, content: string) => {
        setIsPending(true);
        try {
            const result = await sendChatMessageAction(dialogId, content);
            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast.error(error.message);
            return null;
        } finally {
            setIsPending(false);
        }
    };
    const deleteMessage = async (messageId: string) => {
        setIsPending(true);
        try {
            const result = await deleteChatMessageAction(messageId);
            if (result.success) {
                return true;
            } else {
                throw new Error(result.error);
            }
        } finally {
            setIsPending(false);
            return false
        }
    };
    return {
        chatMessages,
        isPending,
        setIsPending,
        setChatMessages,
        fetchChatMessages,
        sendMessage,
        deleteMessage,
    };
}

/**
 * 获取相关问题
 */
export function useFetchRelatedQuestions(question: string) {
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await getRelatedQuestionsAction(question);
                if (result.success) {
                    setData(result.data as any[]);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [question]);

    return { data, isLoading };
}

/**
 * 使用 SSE 发送消息并实现流式打字机效果
 */
export function useSendMessageWithSSE() {
    const [isPending, setIsPending] = useState(false);
    const [partialResponse, setPartialResponse] = useState('');
    const [error, setError] = useState<string | null>(null);

    // 提供取消流的能力
    const abortControllerRef = useRef<AbortController | null>(null);
    // 用于累积接收到的全部内容
    const accumulatedTextRef = useRef<string>('');

    const sendMessageWithSSE = async (dialogId: string, content: string, userId: string, knowledgeBaseId?: string) => {
        setIsPending(true);
        setPartialResponse('');
        setError(null);
        // 重置累积内容
        accumulatedTextRef.current = '';

        // 如果有之前未取消的请求，先取消
        if (abortControllerRef.current) {
            abortControllerRef.current.abort('Cancelling previous request');
        }

        // 创建新的 AbortController
        abortControllerRef.current = new AbortController();
        const { signal } = abortControllerRef.current;

        try {
            console.log('开始 SSE 请求:', { dialogId, content, userId });

            const response = await fetch('/api/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ dialogId, content, userId, knowledgeBaseId: knowledgeBaseId || null }),
                signal, // 传递 abort 信号
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '请求失败');
            }

            if (!response.body) {
                throw new Error('无法读取响应流');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            // 用于处理可能被分割的 SSE 消息
            let buffer = '';
            let messageId = null;

            while (true) {
                const { value, done } = await reader.read();

                if (done) {
                    console.log('读取流完成，检查是否有剩余缓冲区数据');
                    // 处理缓冲区中可能的剩余数据
                    if (buffer.trim()) {
                        processEventData(buffer);
                    }
                    break;
                }

                // 解码字节数据为文本
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                // 处理完整的 SSE 消息
                // SSE 消息格式: "data: {...}\n\n"
                const messages = buffer.split('\n\n');
                // 保留最后一个可能不完整的消息
                buffer = messages.pop() || '';

                // 处理完整的消息
                for (const message of messages) {
                    if (message.trim()) {
                        processEventData(message);
                    }
                }
            }

            // 处理单个 SSE 事件数据
            function processEventData(eventText: string) {
                if (eventText.startsWith('data: ')) {
                    try {
                        const jsonData = eventText.substring(5).trim(); // 移除 "data: "
                        const eventData = JSON.parse(jsonData);

                        // 处理完成事件
                        if (eventData.done) {
                            console.log('SSE 流完成, 消息ID:', eventData.messageId);
                            messageId = eventData.messageId;
                            return;
                        }

                        // 处理错误事件
                        if (eventData.error) {
                            setError(eventData.error);
                            return;
                        }

                        // 处理内容块
                        if (eventData.chunk) {
                            console.log('SSE 收到块:', {
                                chunkLength: eventData.chunk.length,
                                chunk: eventData.chunk.substring(0, 20) + '...',
                                accumulated: accumulatedTextRef.current.length
                            });

                            accumulatedTextRef.current += eventData.chunk;
                            // 记录状态更新前的值
                            console.log('即将更新 partialResponse, 当前值长度:',
                                partialResponse ? partialResponse.length : 0);

                            // 设置新的partial响应
                            setPartialResponse(accumulatedTextRef.current);

                            // 记录实际设置的内容
                            console.log('设置了新的 partialResponse:', {
                                length: accumulatedTextRef.current.length,
                                preview: accumulatedTextRef.current.substring(0, 20) + '...'
                            });
                        }
                    } catch (e) {
                        console.error('解析 SSE 事件失败:', e, eventText);
                    }
                }
            }

            // 确保最终状态是正确的
            console.log('SSE 流处理完成，最终内容长度:', accumulatedTextRef.current.length);

            return {
                success: true,
                messageId,
                content: accumulatedTextRef.current
            };
        } catch (error) {
            // 增强日志记录
            console.error('发送 SSE 消息失败 (Caught in useSendMessageWithSSE):', error);
            if (error && typeof error === 'object') {
                console.error('Properties of caught error:', Object.keys(error));
            }

            // 确定错误消息
            const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : '发送消息失败');
            setError(errorMessage); // 更新本地错误状态

            return {
                success: false,
                error: errorMessage // 返回确定的错误消息
            };
        } finally {
            console.log("SendMessageWithSSE finally block executing");
            console.log(`Final accumulated content: ${accumulatedTextRef.current.substring(0, 50)}${accumulatedTextRef.current.length > 50 ? '...' : ''}`);

            // 确认最终消息状态
            if (abortControllerRef.current) {
                abortControllerRef.current = null;
            }

            // 仅当请求不是被手动取消时才更改pending状态
            if (!signal.aborted) {
                setIsPending(false);
            }
        }
    };

    const cancelStream = () => {
        if (abortControllerRef.current) {
            console.log('Aborting current SSE stream request');
            abortControllerRef.current.abort('Cancel requested by user');
            abortControllerRef.current = null;
            setIsPending(false); // 确保将发送状态重置
        }
    };

    return {
        sendMessageWithSSE,
        cancelStream,
        isPending,
        partialResponse,
        error
    };
}


