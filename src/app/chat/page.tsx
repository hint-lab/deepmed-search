'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChatCard } from './chat-card';
import { ChatMessage } from './chat-message';

export default function ChatPage() {
  const { t } = useTranslation('translation', { keyPrefix: 'chat' });

  return (
    <div className="flex fixed w-full h-full">
      {/* 侧边栏 */}
      <div className="w-80 border-r bg-background">
        <div className="flex h-16 items-center border-b px-4">
          <h2 className="text-lg font-semibold">{t('title')}</h2>
          <Button variant="ghost" size="icon" className="ml-auto">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t('searchPlaceholder')} className="pl-8" />
          </div>
        </div>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="space-y-2 p-4">
            <ChatCard
              title={t('newChat')}
              lastMessage={t('startNewChat')}
              timestamp={t('justNow')}
            />
            <ChatCard
              title="关于项目"
              lastMessage="这是一个使用 Next.js 和 shadcn/ui 构建的聊天应用"
              timestamp="10分钟前"
            />
            <ChatCard
              title="技术支持"
              lastMessage="需要帮助？请随时联系我们"
              timestamp="1小时前"
            />
          </div>
        </ScrollArea>
      </div>

      {/* 主聊天区域 */}
      <div className="flex-1 flex flex-col h-full">
        <div className="flex h-16 items-center border-b px-4">
          <h3 className="text-lg font-semibold">{t('currentChat')}</h3>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <ChatMessage
              content="你好！我是你的AI助手，有什么我可以帮你的吗？"
              timestamp="10:00"
              isUser={false}
            />
            <ChatMessage
              content="你好！我想了解一下这个项目"
              timestamp="10:01"
              isUser={true}
            />
            <ChatMessage
              content="这是一个使用 Next.js 和 shadcn/ui 构建的现代化聊天应用。它提供了美观的界面和流畅的用户体验。"
              timestamp="10:02"
              isUser={false}
            />
          </div>


        </ScrollArea>
        <div className="border-t p-4">
          <div className="flex items-center space-x-2">
            <Input placeholder={t('messagePlaceholder')} />
            <Button>
              {t('send')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
