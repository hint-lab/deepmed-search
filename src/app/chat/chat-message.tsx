'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface ChatMessageProps {
    content: string;
    timestamp: string;
    isUser?: boolean;
    avatar?: string;
}

export function ChatMessage({
    content,
    timestamp,
    isUser = false,
    avatar
}: ChatMessageProps) {
    const { t } = useTranslation('translation', { keyPrefix: 'chat' });

    return (
        <div className={cn("flex gap-2 mb-8", isUser && "flex-row-reverse")}>
            <div className="flex flex-col items-center gap-1">
                <Avatar className="h-6 w-6">
                    <AvatarImage src={avatar} />
                    <AvatarFallback className="text-xs bg-slate-100 dark:bg-slate-700">
                        {isUser ? 'U' : 'A'}
                    </AvatarFallback>
                </Avatar>
                <span className="text-[10px] text-muted-foreground">{timestamp}</span>
            </div>
            <div className={cn(
                "rounded-2xl px-4 py-2 max-w-[85%] break-words dark:bg-slate-800",
                isUser ? "bg-[#14181F] text-white" : "bg-slate-100 dark:bg-slate-700"
            )}>
                <p className="text-sm leading-relaxed">{content}</p>
            </div>
        </div>
    );
} 