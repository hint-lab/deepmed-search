'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslate } from '@/contexts/language-context';
import { MoreVertical, Plus, Search, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/ja';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { IDialog } from '@/types/dialog';
import { DeleteConfirmationDialog } from '@/components/extensions/delete-confirmation-dialog';
import { toast } from 'sonner';
import { CreateChatDialogButton } from './create-button';
import { ChatSidebarItem } from './item';
dayjs.extend(relativeTime);
import { useDialogContext } from '@/contexts/dialog-context';



export default function ChatSidebar() {
  const { t } = useTranslate('chat');
  const router = useRouter();
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const { dialogs, deleteDialog, currentDialog } = useDialogContext();
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
      }

      router.refresh();
      router.push('/chat');
    } catch (error) {
      console.error("Failed to delete all dialogs:", error);
      toast.error(t('deleteAllError', '删除所有对话失败'));
    } finally {
      setShowDeleteAllConfirm(false);
    }
  };

  useEffect(() => {
    console.log(dialogs);
  }, []);
  return (
    <div className="w-80 border-r bg-background flex flex-col h-screen">
      <div className="flex h-14 items-center border-b px-4 justify-between">
        <h2 className="text-lg font-semibold text-foreground">{t('title')}</h2>
        <div className="flex items-center gap-2">
          <CreateChatDialogButton />
          {dialogs.length > 0 && (
            <DeleteConfirmationDialog
              isOpen={showDeleteAllConfirm}
              setIsOpen={setShowDeleteAllConfirm}
              title={t('deleteAllDialogTitle')}
              description={t('deleteAllDialogDescription')}
              confirmText={t('delete')}
              cancelText={t('cancel')}
              onConfirm={handleDeleteAllDialog}
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
        {/* {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-lg" />
          ))
        ) :  */}
        {dialogs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center p-4">{t('noConversations')}</p>
        ) : (
          dialogs.map((dialog) => (
            <ChatSidebarItem
              key={dialog.id}
              dialog={{
                id: dialog.id,
                name: dialog.name,
                description: dialog.description || '',
                update_date: dialog.update_date ? dayjs(dialog.update_date).format('YYYY-MM-DD HH:mm:ss') : ''
              }}
              isActive={dialog.id === currentDialog?.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
