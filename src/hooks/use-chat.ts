'use client';

import { toast } from 'sonner';
import { useTranslate } from '@/hooks/use-language';
import { useState, useEffect, useRef } from 'react';
import { IMessage } from '@/types/message';
import {
    fetchChatMessagesAction,
    sendChatMessageAction,
    sendChatMessageStreamAction,
    deleteChatMessageAction,
    getRelatedQuestionsAction
} from '@/actions/chat';
import { MessageType } from '@/constants/chat';

/**
 * 获取对话消息
 */
export function useChatMessages() {
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchChatMessages = async (dialogId: string) => {
        if (!dialogId) return;
        setIsLoading(true);
        try {
            const result = await fetchChatMessagesAction(dialogId);
            if (result.success) {
                const formattedMessages = result.data.map((msg: any) => ({
                    ...msg,
                    role: msg.role as MessageType,
                    createdAt: new Date(msg.createdAt),
                }));
                setData(formattedMessages);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        data,
        isLoading,
        setData,
        fetchChatMessages
    };
}

/**
 * 发送消息
 */
export function useSendMessage() {
    const { t } = useTranslate('chat')
    const [isPending, setIsPending] = useState(false);

    const sendMessage = async (dialogId: string, content: string) => {
        setIsPending(true);
        try {
            const result = await sendChatMessageAction(dialogId, content);
            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.error || t('errors.sendMessageFailed'));
            }
        } catch (error: any) {
            toast.error(error.message || t('errors.sendMessageFailed'));
            return null;
        } finally {
            setIsPending(false);
        }
    };

    return { sendMessage, isPending };
}

/**
 * 删除消息
 */
export function useDeleteMessage() {
    const { t } = useTranslate('chat')
    const [isPending, setIsPending] = useState(false);

    const deleteMessage = async (messageId: string) => {
        setIsPending(true);
        try {
            const result = await deleteChatMessageAction(messageId);
            if (result.success) {
                toast.success(t('message.deleted'));
            } else {
                throw new Error(result.error);
            }
        } finally {
            setIsPending(false);
        }
    };

    return { deleteMessage, isPending };
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
    const [isLoading, setIsLoading] = useState(false);
    const [partialResponse, setPartialResponse] = useState('');
    const [error, setError] = useState<string | null>(null);

    // 提供取消流的能力
    const abortControllerRef = useRef<AbortController | null>(null);
    // 用于累积接收到的全部内容
    const accumulatedTextRef = useRef<string>('');

    const sendMessageWithSSE = async (dialogId: string, content: string, userId: string, knowledgeBaseId?: string) => {
        setIsLoading(true);
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
                            accumulatedTextRef.current += eventData.chunk;
                            setPartialResponse(accumulatedTextRef.current);
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
            console.error('Type of caught error:', typeof error);
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
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    // 提供取消方法
    const cancelStream = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsLoading(false);
        }
    };

    return {
        sendMessageWithSSE,
        cancelStream,
        isLoading,
        partialResponse,
        error
    };
}


