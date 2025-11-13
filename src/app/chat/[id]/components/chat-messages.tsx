'use client';

import { useEffect, useRef } from 'react';
import { useChatContext } from '@/contexts/chat-context';
import ChatMessageItem from './message-item';
import { Skeleton } from "@/components/ui/skeleton";

// Define props interface
interface ChatMessagesProps {
    dialogId: string;
}

// Loading Skeleton Component
function MessagesSkeleton() {
    return (
        <div className="space-y-4 px-6 py-4">
            {/* Simulate Assistant Message */}
            <div className="flex gap-2 justify-start">
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                </div>
            </div>
            {/* Simulate User Message */}
            <div className="flex gap-2 justify-end">
                <div className="space-y-2 items-end flex flex-col">
                    <Skeleton className="h-4 w-[220px]" />
                </div>
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
            </div>
            {/* Simulate Assistant Message */}
            <div className="flex gap-2 justify-start">
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-[240px]" />
                    <Skeleton className="h-4 w-[180px]" />
                    <Skeleton className="h-4 w-[210px]" />
                </div>
            </div>
        </div>
    );
}

// Accept props object and destructure dialogId
export default function ChatMessages({ dialogId }: ChatMessagesProps) {
    const {
        messages,
        isStreaming,
        currentMessageId,
        currentContent,
        currentReasoning,
        isLoading,
        loadMessages,
        kbChunks,
        isUsingKbForCurrentMessage
    } = useChatContext();

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 自动滚动到底部
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, currentContent, currentReasoning]);

    // Load messages using the dialogId from props
    useEffect(() => {
        if (dialogId) {
            console.log('ChatMessages loading for dialogId from props:', dialogId);
            loadMessages(dialogId);
        }
    }, [dialogId, loadMessages]);

    // 渲染消息列表
    const renderMessages = () => {
        // 如果有正在流式处理的消息，将其添加到消息列表中
        const allMessages = [...messages];
        if (isStreaming && currentMessageId) {
            // 检查是否已经存在当前消息
            const existingMessageIndex = allMessages.findIndex(msg => msg.id === currentMessageId);

            if (existingMessageIndex === -1) {
                // 如果不存在，添加新的消息
                allMessages.push({
                    id: currentMessageId,
                    content: currentContent,
                    role: 'assistant',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    userId: '',
                    dialogId: dialogId,
                    isThinking: currentReasoning.length > 0,
                    thinkingContent: currentReasoning,
                });
            } else {
                // 如果存在，更新内容
                allMessages[existingMessageIndex] = {
                    ...allMessages[existingMessageIndex],
                    content: currentContent,
                    isThinking: currentReasoning.length > 0,
                    thinkingContent: currentReasoning,
                };
            }
        }

        return allMessages.map((message) => (
            <ChatMessageItem
                key={message.id}
                message={message}
                isStreaming={isStreaming && message.id === currentMessageId}
                isThinking={message.isThinking || false}
                streamingState={
                    isStreaming && message.id === currentMessageId
                        ? {
                            reasoningContent: currentReasoning,
                            content: currentContent
                        }
                        : undefined
                }
                currentKbChunks={isStreaming && message.id === currentMessageId ? kbChunks : undefined}
                isUsingKb={isStreaming && message.id === currentMessageId ? isUsingKbForCurrentMessage : undefined}
            />
        ));
    };

    return (
        <div className="flex-1 min-h-0 space-y-4 overflow-y-auto py-4 px-6">
            {isLoading ? (
                <MessagesSkeleton />
            ) : (
                renderMessages()
            )}
            {/* 用于自动滚动的空div */}
            <div ref={messagesEndRef} />
        </div>
    );
} 