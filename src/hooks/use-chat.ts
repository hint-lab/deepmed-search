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

/**
 * 创建对话
 */
export function useCreateDialog() {
    const { t } = useTranslation();
    const [isPending, setIsPending] = useState(false);

    const createDialog = async (data: { name: string; description?: string }) => {
        setIsPending(true);
        try {
            const result = await createChatDialog(data);
            if (result.success) {
                toast.success(t('message.created'));
                return result.data;
            }
            throw new Error(result.error);
        } finally {
            setIsPending(false);
        }
    };

    return { createDialog, isPending };
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

    const deleteDialog = async (id: string) => {
        setIsPending(true);
        try {
            const result = await deleteChatDialog(id);
            if (result.success) {
                toast.success(t('message.deleted'));
            } else {
                throw new Error(result.error);
            }
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
 */
export function useSendMessage() {
    const { t } = useTranslation();
    const [isPending, setIsPending] = useState(false);

    const sendMessage = async (dialogId: string, content: string) => {
        setIsPending(true);
        try {
            const result = await sendChatMessage(dialogId, content);
            if (result.success) {
                toast.success(t('message.deleted'));
            } else {
                throw new Error(result.error);
            }
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


