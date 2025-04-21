'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslate, useLanguageSwitcher } from '@/hooks/use-language';
import { Trash2 } from 'lucide-react';
import Link from 'next/link';
import dayjs from 'dayjs';
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
import { IDialog } from '@/types/db/dialog';

interface ChatDialogItemProps {
    dialog: IDialog;
    isActive?: boolean;
    onDelete?: () => void;
}

export function ChatDialogItem({ dialog, isActive = false, onDelete }: ChatDialogItemProps) {
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