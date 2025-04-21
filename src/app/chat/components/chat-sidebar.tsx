'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslate } from '@/hooks/use-language';
import { MoreVertical, Plus, Search, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/ja';
import { useDeleteChatDialog } from '@/hooks/use-chat';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { IDialog } from '@/types/db/dialog';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { toast } from 'sonner';
import { CreateChatDialogForm } from './create-chat-dialog-form';
dayjs.extend(relativeTime);

interface ChatSidebarItemProps {
  dialog: IDialog;
  isActive?: boolean;
  onDelete?: (dialogId: string) => void;
}

function ChatSidebarItem({ dialog, isActive = false, onDelete }: ChatSidebarItemProps) {
  const { t } = useTranslate('chat');
  const dialogId = dialog.id;
  const dialogName = dialog.name;
  const dialogDescription = dialog.description;
  const { deleteChatDialog, isPending: isDeleting } = useDeleteChatDialog();


  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(dialogId);
    }
  };

  return (
    <Link href={`/chat/${dialogId}`} className="block">
      <div className={cn(
        "flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted group relative",
        isActive && "bg-muted"
      )}>
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {dialogName?.[0]?.toUpperCase() || 'D'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium truncate text-foreground">
              {dialogName}
            </h4>
            <DeleteConfirmationDialog
              title={t('deleteDialogTitle', '删除对话')}
              description={t('deleteDialogDescription', '确定要删除这个对话吗？此操作无法撤销。')}
              confirmText={t('common:delete')}
              cancelText={t('common:cancel')}
              onConfirm={handleConfirmDelete}
              isDeleting={isDeleting}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </DeleteConfirmationDialog>
          </div>
          <div className="flex items-center justify-between gap-2 mt-1">
            <p className="text-xs text-muted-foreground truncate">
              {dialogDescription || t('noDescription')}
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

interface ChatSidebarProps {
  dialogs: IDialog[];
  isLoading: boolean;
  currentDialogId?: string;
}


const createDialogFormSchema = (t: Function) => z.object({
  name: z.string().min(1, { message: t('validation.chatNameRequired', 'Chat name cannot be empty') }),
});

export default function ChatSidebar({ dialogs, isLoading, currentDialogId }: ChatSidebarProps) {
  const { t } = useTranslate('chat');
  const router = useRouter();
  const { deleteChatDialog, isPending: isDeletingDialog } = useDeleteChatDialog();
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  const handleDeleteDialog = async (dialogId: string) => {
    try {
      const result = await deleteChatDialog(dialogId);

      if (result.success) {
        toast.success(t('deleteSuccess'));
        if (currentDialogId === dialogId) {
          router.push('/chat');
        }
        router.refresh();
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

  const handleDeleteAllDialog = async () => {
    try {
      for (const dialog of dialogs) {
        await deleteChatDialog(dialog.id);
      }
      toast.success(t('deleteAllSuccess', '所有对话已删除'));
      router.push('/chat');
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete all dialogs:", error);
      toast.error(t('deleteAllError', '删除所有对话失败'));
    } finally {
      setShowDeleteAllConfirm(false);
    }
  };

  return (
    <div className="w-80 border-r bg-background flex flex-col h-screen">
      <div className="flex h-14 items-center border-b px-4 justify-between">
        <h2 className="text-lg font-semibold text-foreground">{t('title')}</h2>
        <div className="flex items-center gap-2">
          <CreateChatDialogForm />
          {dialogs.length > 0 && (
            <DeleteConfirmationDialog
              title={t('deleteAllDialogTitle', '删除所有对话')}
              description={t('deleteAllDialogDescription', '确定要删除所有对话吗？此操作无法撤销。')}
              confirmText={t('delete')}
              cancelText={t('cancel')}
              onConfirm={handleDeleteAllDialog}
              isDeleting={isDeletingDialog}
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
        </div>
      </div>
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('searchPlaceholder')} className="pl-8" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-lg" />
          ))
        ) : dialogs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center p-4">{t('noConversations')}</p>
        ) : (
          dialogs.map((dialog) => (
            <ChatSidebarItem
              key={dialog.id}
              dialog={dialog}
              isActive={dialog.id === currentDialogId}
              onDelete={handleDeleteDialog}
            />
          ))
        )}
      </div>
    </div>
  );
}
