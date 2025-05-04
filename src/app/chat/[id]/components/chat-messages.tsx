'use client';

import { useEffect, useRef } from 'react';
import { useChatContext } from '@/contexts/chat-context';
import ChatMessageItem from './message-item';

// Define props interface
interface ChatMessagesProps {
    dialogId: string;
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
        loadMessages
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
        console.log('currentMessageId:', currentMessageId);
        console.log('isStreaming:', isStreaming);
        console.log('currentContent:', currentContent);
        console.log('currentReasoning:', currentReasoning);
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
                });
            } else {
                // 如果存在，更新内容
                allMessages[existingMessageIndex] = {
                    ...allMessages[existingMessageIndex],
                    content: currentContent,
                    isThinking: currentReasoning.length > 0,
                };
            }
        }

        return allMessages.map((message) => (
            <ChatMessageItem
                key={message.id}
                message={message}
                thinkingContent={message.isThinking ? currentReasoning : ''}
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
            />
        ));
    };

    return (
        <div className="space-y-4 overflow-y-auto py-4 px-6">
            {isLoading ? (
                <div className="flex justify-center items-center h-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
                </div>
            ) : (
                renderMessages()
            )}
            {/* 用于自动滚动的空div */}
            <div ref={messagesEndRef} />
        </div>
    );
} 