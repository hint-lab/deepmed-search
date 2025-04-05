'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useTranslate } from '@/hooks/use-language';
import { Message } from '@prisma/client';
import dayjs from 'dayjs';

// Define the local message type again here or import it
// For simplicity, defining it here, ensure it matches ChatPage
type LocalMessage = Partial<Message> & { id: string; content: string; role: string; createdAt: Date };

interface ChatMessageItemProps {
    // Accept LocalMessage type
    message: LocalMessage;
}

function ChatMessageItem({ message }: ChatMessageItemProps) {
    const { t } = useTranslate('chat');
    // Access properties directly from LocalMessage
    const isUser = message.role === 'user';
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
                "rounded-lg px-3 py-2 max-w-[75%] break-words shadow-sm",
                isUser
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border"
            )}>
                <p className="text-sm leading-relaxed">{content}</p>
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
    messages: LocalMessage[];
}

export default function ChatMessages({ messages }: ChatMessagesProps) {
    return (
        <div className="space-y-4 pt-12">
            {messages.map((msg) => (
                <ChatMessageItem key={msg.id} message={msg} />
            ))}
        </div>
    );
} 