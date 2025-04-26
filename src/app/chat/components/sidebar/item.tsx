'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DeleteConfirmationDialog } from "@/components/extensions/delete-confirmation-dialog";
import { Button } from "@/components/ui/button";
import { useTranslate } from '@/contexts/language-context';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from 'next/link';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import { useDialogContext } from '@/contexts/dialog-context';

interface ChatSidebarItemProps {
    dialog: {
        id: string;
        name: string;
        description?: string;
        update_date?: string;
    };
    isActive?: boolean;
}

export function ChatSidebarItem({ dialog, isActive = false }: ChatSidebarItemProps) {
    const { t } = useTranslate('chat');
    const router = useRouter();
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);
    const { deleteDialog, isDeleting } = useDialogContext();
    const onDelete = async (dialogId: string): Promise<void> => {
        try {
            const result = await deleteDialog(dialogId);
            setShowDeleteAlert(false);
            if (result.success) {
                toast.success(t('deleteSuccess'));
                if (isActive) {
                    router.push('/chat');
                }
            } else {
                const errorMessage = result.error === 'Dialog not found'
                    ? t('errors.dialogNotFound', '对话不存在或已被删除')
                    : t('deleteError');
                toast.error(errorMessage);
            }
        } catch (error) {
            console.error("Failed to delete dialog:", error);
            toast.error(t('deleteError'));
        }
    };
    return (
        <Link href={`/chat/${dialog.id}`} className="block">
            <div className={cn(
                "flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted group relative",
                isActive && "bg-muted"
            )}>
                <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {dialog.name?.[0]?.toUpperCase() || 'D'}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium truncate text-foreground">
                            {dialog.name}
                        </h4>
                        <DeleteConfirmationDialog
                            isOpen={showDeleteAlert}
                            setIsOpen={setShowDeleteAlert}
                            onConfirm={() => onDelete(dialog.id)}
                            isDeleting={isDeleting}
                            title={t('deleteDialogTitle')}
                            description={t('deleteDialogDescription')}
                            confirmText={t('deleteConfirmText')}
                            cancelText={t('deleteCancelText')}
                        >
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                disabled={isDeleting}
                            >
                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                        </DeleteConfirmationDialog>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="text-xs text-muted-foreground truncate">
                            {dialog.description || t('noDescription')}
                        </p>
                        <p className="text-[10px] text-muted-foreground shrink-0">
                            {dialog.update_date ? dayjs(dialog.update_date).fromNow() : '-'}
                        </p>
                    </div>
                </div>
            </div>
        </Link>
    );
} 