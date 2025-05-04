'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useTranslate } from '@/contexts/language-context';
import { IMessage } from '@/types/message';
import dayjs from 'dayjs';
import { MessageType } from '@/constants/chat';
import { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ThinkingModeMessage } from './thinking-mode-message';

interface ChatMessageItem {
    message: IMessage,
    thinkingContent: string,
    isStreaming: boolean,
    isThinking: boolean,
    streamingState?: {
        reasoningContent: string;
        content: string;
    }
}

function ChatMessageItem({
    message,
    thinkingContent,
    isStreaming,
    isThinking,
    streamingState = { reasoningContent: '', content: '' }
}: ChatMessageItem) {
    console.log(`[ChatMessageItem Debug] ID=${message.id}, Role=${message.role}, isThinking=${isThinking}, isStreaming=${isStreaming}`);
    console.log(`[ChatMessageItem Debug] Content Length: ${message.content?.length}`);
    if (isThinking) {
        console.log(`[ChatMessageItem Debug] thinkingContent:`, thinkingContent);
    }
    if (isStreaming) {
        console.log(`[ChatMessageItem Debug] streamingState:`, streamingState);
    }

    const { t } = useTranslate('chat');
    useEffect(() => {
        if (isStreaming) {
            console.log(`[ChatMessageItem] 🔄 Streaming message with ID=${message.id}`);
            console.log(`[ChatMessageItem] Content preview: "${message.content.substring(0, 30)}..."`);
            console.log(`[ChatMessageItem] Content length: ${message.content.length}`);
            if (isThinking) {
                console.log(`[ChatMessageItem] Reasoning length: ${streamingState.reasoningContent.length}`);
                console.log(`[ChatMessageItem] Answer length: ${streamingState.content.length}`);
            }
        }
    }, [isStreaming, message.id, message.content, isThinking, streamingState]);

    const isUser = message.role === MessageType.User;
    const createdAt = message.createdAt;
    let content = message.content;
    const messageId = message.id;

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
                isStreaming && !isUser ? "border-blue-500 border-2" : ""
            )}>
                {isThinking ? (
                    <div className="flex flex-col gap-4">
                        <ThinkingModeMessage
                            thinkingContent={thinkingContent}
                            isStreaming={isStreaming}
                            streamingReasoning={streamingState.reasoningContent}
                            streamingContent={streamingState.content}
                        />
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        <div className={cn(
                            "prose prose-sm dark:prose-invert max-w-none",
                            isStreaming && !isUser && "animate-blinking-cursor"
                        )}>
                            <ReactMarkdown>
                                {content || ''}
                            </ReactMarkdown>
                        </div>
                        {isStreaming && (
                            <div className="mt-1 text-xs text-blue-500">
                                <span>回答中... (内容长度: {content?.length || 0})</span>
                            </div>
                        )}
                    </div>
                )}
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

export default ChatMessageItem;