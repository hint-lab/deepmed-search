'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useTranslate } from '@/contexts/language-context';
import { IMessage } from '@/types/message';
import dayjs from 'dayjs';
import { MessageType } from '@/constants/chat';
import { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User } from 'lucide-react';

interface ChatMessageItemProps {
    message: IMessage;
    isStreaming: boolean;
}

function ChatMessageItem({ message, isStreaming }: ChatMessageItemProps) {
    const { t } = useTranslate('chat');
    const isUser = message.role === MessageType.User;
    const createdAt = message.createdAt;
    let content = message.content;
    const messageId = message.id;

    if (isStreaming && content !== undefined) {
        content += '';
    }

    const timestamp = createdAt ? dayjs(createdAt).format('HH:mm') : '--:--';

    return (
        <div key={messageId} className={cn("flex gap-2 mb-4", isUser ? "justify-end" : "justify-start")}>
            {!isUser && (
                <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        AI
                    </AvatarFallback>
                </Avatar>
            )}
            <div className={cn(
                "rounded-lg max-w-[85%] md:max-w-[75%] break-words shadow-sm border",
                "p-3",
                isUser
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "bg-muted text-card-foreground border-border",
            )}>
                <div className={cn(
                    "prose prose-sm dark:prose-invert max-w-none",
                    isStreaming && !isUser && "animate-blinking-cursor"
                )}>
                    <ReactMarkdown>
                        {content || ''}
                    </ReactMarkdown>
                </div>
            </div>
            {isUser && (
                <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-xs bg-muted">
                        U
                    </AvatarFallback>
                </Avatar>
            )}
        </div>
    );
}

interface ChatMessagesProps {
    messages: IMessage[];
    streamingMessageId?: string | null;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, streamingMessageId }) => {
    useEffect(() => {
        console.log("ChatMessages rendered. Messages:", messages, "Streaming ID:", streamingMessageId);
    }, [messages, streamingMessageId]);

    return (
        <div className="flex flex-col gap-4 md:px-6 overflow-y-auto h-full">
            {messages.map((message) => (
                <ChatMessageItem
                    key={message.id}
                    message={message}
                    isStreaming={message.id === streamingMessageId}
                />
            ))}
        </div>
    );
};

export default ChatMessages; 