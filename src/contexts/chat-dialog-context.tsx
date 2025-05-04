"use client"
import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { IDialog } from '@/types/dialog';
import { useRouter } from 'next/navigation';
import { useTranslate } from '@/contexts/language-context';
import {
    createChatDialogAction,
    updateChatDialogAction,
    deleteChatDialogAction,
    getChatDialogListAction
} from '@/actions/chat-dialog';
import { useSession } from 'next-auth/react';

interface ChatDialogContextType {
    chatDialogs: IDialog[];
    isLoading: boolean;
    currentChatDialog?: IDialog;
    refreshChatDialogs: () => Promise<void>;
    createChatDialog: (params: { name: string; description?: string; knowledgeBaseId?: string; userId: string }) => Promise<IDialog | null>;
    updateChatDialog: (id: string, data: { name?: string; description?: string }) => Promise<boolean>;
    deleteChatDialog: (id: string) => Promise<{ success: boolean; error?: string }>;
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
}

const ChatDialogContext = createContext<ChatDialogContextType | undefined>(undefined);

export function ChatDialogProvider({ children }: { children: ReactNode }) {
    const [chatDialogs, setChatDialogs] = useState<IDialog[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentChatDialog, setCurrentChatDialog] = useState<IDialog | undefined>();
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { data: session } = useSession();
    const router = useRouter();
    const { t } = useTranslate('chat');

    // 获取对话列表
    const fetchChatDialogs = useCallback(async () => {
        if (!session?.user?.id) return;

        setIsLoading(true);
        try {
            const result = await getChatDialogListAction();
            if (result.success) {
                setChatDialogs(result.data as IDialog[]);
            } else {
                throw new Error(result.error || 'Failed to fetch dialogs');
            }
        } catch (error) {
            console.error('Error fetching dialogs:', error);
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    // 刷新对话列表
    const refreshChatDialogs = useCallback(async () => {
        await fetchChatDialogs();
    }, [fetchChatDialogs]);

    // 删除对话
    const deleteChatDialog = useCallback(async (id: string) => {
        setIsDeleting(true);
        try {
            const result = await deleteChatDialogAction(id);
            if (result.success) {
                // 更新本地状态
                setChatDialogs(prev => {
                    const newDialogs = prev.filter(dialog => dialog.id !== id);
                    if (newDialogs.length === 0) {
                        setCurrentChatDialog(undefined);
                    } else if (currentChatDialog?.id === id) {
                        setCurrentChatDialog(newDialogs[0]);
                    }
                    return newDialogs;
                });
                return { success: true };
            }
            return {
                success: false,
                error: result.error || t('deleteError', '删除对话失败')
            };
        } catch (error) {
            console.error('Error deleting dialog:', error);
            return {
                success: false,
                error: t('deleteError', '删除对话失败')
            };
        } finally {
            setIsDeleting(false);
        }
    }, [currentChatDialog, t]);

    // 创建对话
    const createChatDialog = useCallback(async (params: { name: string; description?: string; knowledgeBaseId?: string; userId: string }) => {
        setIsCreating(true);
        try {
            const result = await createChatDialogAction(params);
            if (result.success) {
                const newDialog = result.data as IDialog;
                setChatDialogs(prev => [newDialog, ...prev]);
                setCurrentChatDialog(newDialog);
                return newDialog;
            }
            throw new Error(result.error || t('createError', '创建对话失败'));
        } catch (error) {
            console.error('Error creating dialog:', error);
            return null;
        } finally {
            setIsCreating(false);
        }
    }, [t]);

    // 更新对话信息
    const updateChatDialog = useCallback(async (id: string, data: { name?: string; description?: string }) => {
        setIsUpdating(true);
        try {
            const result = await updateChatDialogAction(id, data);
            if (result.success) {
                setChatDialogs(prev => prev.map(dialog =>
                    dialog.id === id ? { ...dialog, ...result.data } : dialog
                ));
                return true;
            }
            throw new Error(result.error || t('updateError', '更新对话失败'));
        } catch (error) {
            console.error('Error updating dialog:', error);
            return false;
        } finally {
            setIsUpdating(false);
        }
    }, [t]);

    // 初始加载对话列表
    useEffect(() => {
        fetchChatDialogs();
    }, [fetchChatDialogs]);

    // 当 currentChatDialogId 或 chatDialogs 变化时，更新 currentChatDialog
    useEffect(() => {
        if (currentChatDialog) {
            const foundDialog = chatDialogs.find(d => d.id === currentChatDialog.id);
            if (foundDialog !== currentChatDialog) {
                setCurrentChatDialog(foundDialog);
            }
        } else {
            if (currentChatDialog !== undefined) {
                setCurrentChatDialog(undefined);
            }
        }
    }, [chatDialogs, currentChatDialog]);

    return (
        <ChatDialogContext.Provider value={{
            chatDialogs,
            isLoading,
            currentChatDialog,
            refreshChatDialogs,
            createChatDialog,
            updateChatDialog,
            deleteChatDialog,
            isCreating,
            isUpdating,
            isDeleting
        }}>
            {children}
        </ChatDialogContext.Provider>
    );
}

export function useChatDialogContext() {
    const context = useContext(ChatDialogContext);
    if (context === undefined) {
        throw new Error('useChatDialog must be used within a ChatDialogProvider');
    }
    return context;
} 