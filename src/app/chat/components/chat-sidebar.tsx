'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslate, useLanguageSwitcher } from '@/hooks/use-language';
import { MoreVertical, Plus, Search, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/extensions/alert-dialog";
import { toast } from 'sonner';
import { CreateChatDialogForm } from './create-chat-dialog-form';
dayjs.extend(relativeTime);

interface ChatSidebarItemProps {
  dialog: IDialog;
  isActive?: boolean;
  onDelete?: () => void;
}

function ChatSidebarItem({ dialog, isActive = false, onDelete }: ChatSidebarItemProps) {
  const { t } = useTranslate('chat');
  const dialogId = dialog.id;
  const dialogName = dialog.name;
  const dialogDescription = dialog.description;
  const { currentLanguage } = useLanguageSwitcher();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateLocale = () => {
    let localeToSet = 'en';
    if (currentLanguage.startsWith('zh')) {
      localeToSet = 'zh-cn';
    } else if (currentLanguage.startsWith('ja')) {
      localeToSet = 'ja';
    }
    dayjs.locale(localeToSet);
  };
  updateLocale();

  const handleDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // 阻止链接跳转
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (onDelete) {
      onDelete();
    }
    setShowDeleteConfirm(false);
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
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('deleteDialogTitle', '删除对话')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('deleteDialogDescription', '确定要删除这个对话吗？此操作无法撤销。')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={(e) => e.preventDefault()}>
                    {t('common:cancel')}
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
                    {t('common:delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
  const { deleteDialog } = useDeleteChatDialog();
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  const handleDeleteDialog = async (dialogId: string) => {
    try {
      const result = await deleteDialog(dialogId);
      if (result.success) {
        toast.success(t('deleteSuccess'));
        if (currentDialogId === dialogId) {
          router.push('/chat');
        }
        router.refresh(); // 刷新页面以更新对话列表
      } else {
        // 根据错误类型显示不同的错误消息
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
      // 删除所有对话
      for (const dialog of dialogs) {
        await deleteDialog(dialog.id);
      }
      toast.success(t('deleteAllSuccess', '所有对话已删除'));
      // 先跳转到聊天主页
      router.push('/chat');
      // 强制刷新页面
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete all dialogs:", error);
      toast.error(t('deleteAllError', '删除所有对话失败'));
    } finally {
      setShowDeleteAllConfirm(false);
    }
  };

  return (
    <div className="w-80 border-r bg-background flex flex-col pt-16 h-screen">
      <div className="flex h-14 items-center border-b px-4 justify-between">
        <h2 className="text-lg font-semibold text-foreground">{t('title')}</h2>
        <div className="flex items-center gap-2">
          <CreateChatDialogForm />
          {dialogs.length > 0 && (
            <AlertDialog open={showDeleteAllConfirm} onOpenChange={setShowDeleteAllConfirm}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('deleteAllDialogTitle', '删除所有对话')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('deleteAllDialogDescription', '确定要删除所有对话吗？此操作无法撤销。')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {t('common:cancel')}
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAllDialog} className="bg-destructive hover:bg-destructive/90">
                    {t('common:delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('searchPlaceholder')} className="pl-8" />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-4 pt-0">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 p-2 rounded-lg">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))
          ) : dialogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('noConversations')}</p>
          ) : (
            dialogs.map((dialog: IDialog) => (
              <ChatSidebarItem
                key={dialog.id}
                dialog={dialog}
                isActive={dialog.id === currentDialogId}
                onDelete={() => handleDeleteDialog(dialog.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
