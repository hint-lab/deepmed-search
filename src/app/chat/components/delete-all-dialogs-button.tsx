'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslate } from '@/contexts/language-context';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { IDialog } from '@/types/dialog';
import { DeleteConfirmationDialog } from '@/components/extensions/delete-confirmation-dialog';
import { toast } from 'sonner';
import { useDialog } from '@/contexts/dialog-context';

interface DeleteAllDialogsButtonProps {
    dialogs: IDialog[];
}

export default function DeleteAllDialogsButton({ dialogs }: DeleteAllDialogsButtonProps) {
    const { t } = useTranslate('chat');
    const router = useRouter();
    const { refreshDialogs, deleteDialog, isDeleting } = useDialog();
    const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

    const handleDeleteAllDialog = async () => {
        try {
            const deletePromises = dialogs.map(dialog => deleteDialog(dialog.id));
            const results = await Promise.allSettled(deletePromises);

            const failedDeletions = results.filter(result => result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success));

            if (failedDeletions.length > 0) {
                console.error("Failed to delete some dialogs:", failedDeletions);
                toast.error(t('deleteAllSomeError', '部分对话删除失败'));
            } else {
                toast.success(t('deleteAllSuccess', '所有对话已删除'));
                // 使用 DialogContext 刷新对话列表
                await refreshDialogs();
            }

            router.push('/chat');
        } catch (error) {
            console.error("Failed to delete all dialogs:", error);
            toast.error(t('deleteAllError', '删除所有对话失败'));
        } finally {
            setShowDeleteAllConfirm(false);
        }
    };

    return (
        <>
            {dialogs.length > 0 && (
                <DeleteConfirmationDialog
                    isOpen={showDeleteAllConfirm}
                    setIsOpen={setShowDeleteAllConfirm}
                    title={t('deleteAllDialogTitle', '删除所有对话')}
                    description={t('deleteAllDialogDescription', '确定要删除所有对话吗？此操作无法撤销。')}
                    confirmText={t('delete', '删除')}
                    cancelText={t('cancel', '取消')}
                    onConfirm={handleDeleteAllDialog}
                    isDeleting={isDeleting}
                >
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 p-0"
                    >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                </DeleteConfirmationDialog>
            )}
        </>
    );
}
