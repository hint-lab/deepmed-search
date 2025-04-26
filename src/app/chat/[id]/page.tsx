'use client';

import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import ChatMessages from '../components/chat-messages';
import { useChatContext } from '@/contexts/chat-context';
import { useEffect } from 'react';

export default function ChatPage() {
    const params = useParams();
    const dialogId = params.id as string;

    const {
        messages,
        isLoadingMessages,
        streamingMessageId,
        loadChatHistory
    } = useChatContext();

    // 加载聊天历史
    useEffect(() => {
        if (dialogId) {
            loadChatHistory(dialogId);
        }
    }, [dialogId, loadChatHistory]);

    return (
        <div className="flex flex-col flex-1 p-4 bg-muted/30 overflow-hidden">
            {isLoadingMessages && (!messages || messages.length === 0) ? (
                <div className="space-y-4 p-4">
                    <Skeleton className="h-16 w-3/4" />
                    <Skeleton className="h-16 w-3/4 ml-auto" />
                    <Skeleton className="h-16 w-2/3" />
                </div>
            ) : (
                <ChatMessages messages={messages} streamingMessageId={streamingMessageId} />
            )}
        </div>
    );
}
