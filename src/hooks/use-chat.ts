'use client';

import { toast } from 'sonner';
import { useTranslate } from '@/hooks/use-language';
import { useState, useEffect, useRef } from 'react';
import {
    getChatDialogListAction,
    createChatDialogAction,
    updateChatDialogAction,
    deleteChatDialogAction,
    getChatConversationAction,
    sendChatMessageAction,
    deleteChatMessageAction,
    getRelatedQuestionsAction
} from '@/actions/chat';

/**
 * 获取对话列表
 */
export function useChatDialogList() {
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await getChatDialogListAction();
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
    }, []);

    return { data, isLoading };
}

interface CreateDialogParams {
    name: string;
    description?: string;
    knowledgeBaseId?: string;
    userId: string;
}

/**
 * 创建对话
 */
export function useCreateChatDialog() {
    const [loading, setLoading] = useState(false);
    const { t } = useTranslate('chat');

    const createChatDialog = async (params: CreateDialogParams) => {
        setLoading(true);
        try {
            const result = await createChatDialogAction(params);
            if (result.success) {
                toast.success(t('createSuccess'));
                return result.data;
            }
            throw new Error(result.error);
        } finally {
            setLoading(false);
        }
    };

    return { createChatDialog, loading };
}

/**
 * 更新对话
 */
export function useUpdateChatDialog() {
    const { t } = useTranslate('chat')
    const [isPending, setIsPending] = useState(false);

    const updateChatDialog = async ({
        id,
        data,
    }: {
        id: string;
        data: { name?: string; description?: string };
    }) => {
        setIsPending(true);
        try {
            const result = await updateChatDialogAction(id, data);
            if (result.success) {
                toast.success(t('message.modified'));
                return result.data;
            }
            throw new Error(result.error);
        } finally {
            setIsPending(false);
        }
    };

    return { updateChatDialog, isPending };
}

/**
 * 删除对话
 */
export function useDeleteChatDialog() {
    const { t } = useTranslate('chat')
    const [isPending, setIsPending] = useState(false);

    const deleteDialog = async (id: string): Promise<{ success: boolean; error?: string; data?: any }> => {
        setIsPending(true);
        try {
            const result = await deleteChatDialogAction(id);
            if (!result.success) {
                throw new Error(result.error || t('message.deleteFailed'));
            }
            return result;
        } catch (error) {
            console.error('Delete dialog error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : t('message.deleteFailed')
            };
        } finally {
            setIsPending(false);
        }
    };

    return { deleteDialog, isPending };
}

/**
 * 获取对话消息
 */
export function useConversation(dialogId: string) {
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!dialogId) return;
            try {
                const result = await getChatConversationAction(dialogId);
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
    }, [dialogId]);

    return { data, isLoading };
}

/**
 * 发送消息
 * 注意：这个Hook发送消息后，通常期望后台API返回AI的完整响应。
 * 如果你需要流式响应，请使用 useSendMessageWithSSE。
 */
export function useSendMessage() {
    const { t } = useTranslate('chat') // 使用 'chat' 命名空间
    const [isPending, setIsPending] = useState(false);

    const sendMessage = async (dialogId: string, content: string) => {
        setIsPending(true);
        try {
            // 注意：sendChatMessage 内部调用 /api/chat/message,
            // 这个 API 需要负责生成并可能保存助手的响应
            const result = await sendChatMessageAction(dialogId, content);
            if (result.success) {
                // 假设 result.data 包含AI响应（如果API设计如此）
                // toast.success(t('message.sent')); // 修正提示消息
                return result.data; // 返回数据给调用者处理
            } else {
                throw new Error(result.error || t('errors.sendMessageFailed'));
            }
        } catch (error: any) {
            toast.error(error.message || t('errors.sendMessageFailed'));
            return null; // 返回 null 或抛出错误
        }
        finally {
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

    const sendMessageWithSSE = async (dialogId: string, content: string, userId: string) => {
        setIsLoading(true);
        setPartialResponse('');
        setError(null);
        // 重置累积内容
        accumulatedTextRef.current = '';

        // 如果有之前未取消的请求，先取消
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
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
                body: JSON.stringify({ dialogId, content, userId }),
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
            console.error('发送 SSE 消息失败:', error);
            setError(error instanceof Error ? error.message : '发送消息失败');
            return {
                success: false,
                error: error instanceof Error ? error.message : '发送消息失败'
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


