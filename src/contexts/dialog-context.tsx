"use client"
import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { IDialog } from '@/types/dialog';
import { useUser } from './user-context';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslate } from '@/hooks/use-language';
import {
    createChatDialogAction,
    updateChatDialogAction,
    deleteChatDialogAction,
    getChatDialogListAction
} from '@/actions/chat';

interface DialogContextType {
    dialogs: IDialog[];
    isLoading: boolean;
    currentDialogId?: string;
    currentDialog?: IDialog;
    refreshDialogs: () => Promise<void>;
    removeDialog: (dialogId: string) => void;
    setCurrentDialogId: (dialogId?: string) => void;
    createDialog: (params: { name: string; description?: string; knowledgeBaseId?: string; userId: string }) => Promise<IDialog | null>;
    updateDialogInfo: (id: string, data: { name?: string; description?: string }) => Promise<boolean>;
    deleteDialog: (id: string) => Promise<{ success: boolean; error?: string }>;
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
    const [dialogs, setDialogs] = useState<IDialog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentDialogId, setCurrentDialogId] = useState<string | undefined>();
    const [currentDialog, setCurrentDialog] = useState<IDialog | undefined>();
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { userInfo } = useUser();
    const router = useRouter();
    const { t } = useTranslate('chat');

    // 获取对话列表
    const fetchDialogs = useCallback(async () => {
        if (!userInfo?.id) return;

        setIsLoading(true);
        try {
            const result = await getChatDialogListAction();
            if (result.success) {
                setDialogs(result.data as IDialog[]);
            } else {
                throw new Error(result.error || 'Failed to fetch dialogs');
            }
        } catch (error) {
            console.error('Error fetching dialogs:', error);
            toast.error(t('fetchDialogsError', '获取对话列表失败'));
        } finally {
            setIsLoading(false);
        }
    }, [userInfo?.id, t]);

    // 刷新对话列表
    const refreshDialogs = useCallback(async () => {
        await fetchDialogs();
    }, [fetchDialogs]);


    // 删除对话
    const removeDialog = useCallback((dialogId: string) => {
        setDialogs(prev => prev.filter(dialog => dialog.id !== dialogId));
        if (currentDialogId === dialogId) {
            setCurrentDialogId(undefined);
            router.push('/chat');
        }
    }, [currentDialogId, router]);

    // 创建对话
    const createDialog = useCallback(async (params: { name: string; description?: string; knowledgeBaseId?: string; userId: string }) => {
        setIsCreating(true);
        try {
            const result = await createChatDialogAction(params);
            if (result.success) {
                toast.success(t('createSuccess', '对话创建成功'));
                const newDialog = result.data as IDialog;
                setDialogs(prev => [newDialog, ...prev]);
                setCurrentDialogId(newDialog.id);
                setCurrentDialog(newDialog);
                return newDialog;
            }
            throw new Error(result.error || t('createError', '创建对话失败'));
        } catch (error) {
            console.error('Error creating dialog:', error);
            toast.error(t('createError', '创建对话失败'));
            return null;
        } finally {
            setIsCreating(false);
        }
    }, [t]);

    // 更新对话信息
    const updateDialogInfo = useCallback(async (id: string, data: { name?: string; description?: string }) => {
        setIsUpdating(true);
        try {
            const result = await updateChatDialogAction(id, data);
            if (result.success) {
                toast.success(t('updateSuccess', '对话更新成功'));
                setDialogs(prev => prev.map(dialog =>
                    dialog.id === id ? { ...dialog, ...result.data } : dialog
                ));
                return true;
            }
            throw new Error(result.error || t('updateError', '更新对话失败'));
        } catch (error) {
            console.error('Error updating dialog:', error);
            toast.error(t('updateError', '更新对话失败'));
            return false;
        } finally {
            setIsUpdating(false);
        }
    }, [t]);

    // 删除对话
    const deleteDialog = useCallback(async (id: string) => {
        setIsDeleting(true);
        try {
            const result = await deleteChatDialogAction(id);
            if (result.success) {
                toast.success(t('deleteSuccess', '对话删除成功'));
                removeDialog(id);
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
    }, [removeDialog, t]);

    // 初始加载对话列表
    useEffect(() => {
        fetchDialogs();
    }, [fetchDialogs]);

    // 当 currentDialogId 或 dialogs 变化时，更新 currentDialog
    useEffect(() => {
        if (currentDialogId) {
            const foundDialog = dialogs.find(d => d.id === currentDialogId);
            if (foundDialog !== currentDialog) {
                setCurrentDialog(foundDialog);
            }
        } else {
            if (currentDialog !== undefined) {
                setCurrentDialog(undefined);
            }
        }
    }, [currentDialogId, dialogs, currentDialog]);

    return (
        <DialogContext.Provider value={{
            dialogs,
            isLoading,
            currentDialogId,
            currentDialog,
            refreshDialogs,
            removeDialog,
            setCurrentDialogId,
            createDialog,
            updateDialogInfo,
            deleteDialog,
            isCreating,
            isUpdating,
            isDeleting
        }}>
            {children}
        </DialogContext.Provider>
    );
}

export function useDialog() {
    const context = useContext(DialogContext);
    if (context === undefined) {
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
} 