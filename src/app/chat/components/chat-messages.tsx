'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useTranslate } from '@/hooks/use-language';
import { IMessage } from '@/types/db/message';
import dayjs from 'dayjs';
import { MessageType } from '@/constants/chat';
import { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User } from 'lucide-react';


interface ChatMessageItemProps {
    // Accept LocalMessage type
    message: IMessage;
}

function ChatMessageItem({ message }: ChatMessageItemProps) {
    const { t } = useTranslate('chat');
    // Access properties directly from LocalMessage
    const isUser = message.role === MessageType.User;
    const createdAt = message.createdAt;
    const content = message.content;
    const messageId = message.id;

    // Use dayjs to format timestamp
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
                "rounded-lg px-3 py-2 max-w-[75%] break-words",
                "prose dark:prose-invert prose-sm",
                isUser
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
            )}>
                <ReactMarkdown>
                    {content}
                </ReactMarkdown>
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
    // Expect LocalMessage array
    messages: IMessage[];
}

export default function ChatMessages({ messages }: ChatMessagesProps) {
    useEffect(() => {
        console.log(messages)
    }, [messages])

    return (
        <div className="space-y-4 pt-12 mt-6">
            {messages.map((msg) => (
                <ChatMessageItem key={msg.id} message={msg} />
            ))}
        </div>
    );
} 