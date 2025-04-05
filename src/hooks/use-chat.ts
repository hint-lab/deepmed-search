'use client';

import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import {
    getChatDialogList,
    createChatDialog,
    updateChatDialog,
    deleteChatDialog,
    getChatConversation,
    sendChatMessage,
    deleteChatMessage,
    sendChatMessageWithSSE,
    getRelatedQuestions
} from '@/actions/chat';
/**
 * 获取对话列表
 */
export function useDialogList() {
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await getChatDialogList();
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
}

/**
 * 创建对话
 */
export function useCreateDialog() {
    const [loading, setLoading] = useState(false);
    const { t } = useTranslation();

    const createDialog = async (params: CreateDialogParams) => {
        setLoading(true);
        try {
            const result = await createChatDialog(params);
            if (result.success) {
                toast.success(t('createSuccess'));
                return result.data;
            }
            throw new Error(result.error);
        } finally {
            setLoading(false);
        }
    };

    return { createDialog, loading };
}

/**
 * 更新对话
 */
export function useUpdateDialog() {
    const { t } = useTranslation();
    const [isPending, setIsPending] = useState(false);

    const updateDialog = async ({
        id,
        data,
    }: {
        id: string;
        data: { name?: string; description?: string };
    }) => {
        setIsPending(true);
        try {
            const result = await updateChatDialog(id, data);
            if (result.success) {
                toast.success(t('message.modified'));
                return result.data;
            }
            throw new Error(result.error);
        } finally {
            setIsPending(false);
        }
    };

    return { updateDialog, isPending };
}

/**
 * 删除对话
 */
export function useDeleteDialog() {
    const { t } = useTranslation();
    const [isPending, setIsPending] = useState(false);

    const deleteDialog = async (id: string): Promise<{ success: boolean; error?: string; data?: any }> => {
        setIsPending(true);
        try {
            const result = await deleteChatDialog(id);
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
                const result = await getChatConversation(dialogId);
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
    const { t } = useTranslation('chat'); // 使用 'chat' 命名空间
    const [isPending, setIsPending] = useState(false);

    const sendMessage = async (dialogId: string, content: string) => {
        setIsPending(true);
        try {
            // 注意：sendChatMessage 内部调用 /api/chat/message,
            // 这个 API 需要负责生成并可能保存助手的响应
            const result = await sendChatMessage(dialogId, content);
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
    const { t } = useTranslation();
    const [isPending, setIsPending] = useState(false);

    const deleteMessage = async (messageId: string) => {
        setIsPending(true);
        try {
            const result = await deleteChatMessage(messageId);
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
                const result = await getRelatedQuestions(question);
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
 * 发送消息（SSE）
 */
export function useSendMessageWithSSE() {
    const sendMessageWithSSE = async (dialogId: string, content: string) => {
        const result = await sendChatMessageWithSSE(dialogId, content);
        return result;
    };

    return { sendMessageWithSSE };
}


