'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { MoreVertical } from 'lucide-react';

interface ChatCardProps {
  title?: string;
  lastMessage?: string;
  timestamp?: string;
  avatar?: string;
  isActive?: boolean;
}

export function ChatCard({
  title = '新对话',
  lastMessage = '开始新的对话...',
  timestamp = '刚刚',
  avatar,
  isActive = false
}: ChatCardProps) {
  const { t } = useTranslation('translation', { keyPrefix: 'chat' });

  return (
    <div className={cn(
      "flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-slate-100 group",
      isActive && "bg-slate-100"
    )}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={avatar} />
        <AvatarFallback className="bg-slate-200">{title[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium truncate">{title}</h4>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground truncate">{lastMessage}</p>
          <p className="text-[10px] text-muted-foreground shrink-0">{timestamp}</p>
        </div>
      </div>
    </div>
  );
}
