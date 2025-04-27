'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useTranslate } from '@/contexts/language-context';
import { IMessage } from '@/types/message';
import dayjs from 'dayjs';
import { MessageType } from '@/constants/chat';
import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User } from 'lucide-react';
import { useChatContext } from '@/contexts/chat-context';
import { useRouter, useSearchParams, useParams } from 'next/navigation';

interface ChatMessageItem {
    message: IMessage,
    isStreaming: boolean
}

function ChatMessageItem({ message, isStreaming }: ChatMessageItem) {
    const { t } = useTranslate('chat');

    useEffect(() => {
        if (isStreaming) {
            console.log(`[ChatMessageItem] 🔄 Streaming message with ID=${message.id}`);
            console.log(`[ChatMessageItem] Content preview: "${message.content.substring(0, 30)}..."`);
            console.log(`[ChatMessageItem] Content length: ${message.content.length}`);
        }
    }, [isStreaming, message.id, message.content]);

    const isUser = message.role === MessageType.User;
    const createdAt = message.createdAt;
    let content = message.content;
    const messageId = message.id;

    if (isStreaming) {
        console.log(`[ChatMessageItem] Rendering streaming message: ID=${messageId}, ContentLen=${content.length}`);
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
                isStreaming && !isUser ? "border-blue-500 border-2" : ""
            )}>
                <div className={cn(
                    "prose prose-sm dark:prose-invert max-w-none",
                    isStreaming && !isUser && "animate-blinking-cursor"
                )}>
                    {isStreaming ? (
                        <div>
                            <pre className="whitespace-pre-wrap">{content || ''}</pre>
                        </div>
                    ) : (
                        <ReactMarkdown>
                            {content || ''}
                        </ReactMarkdown>
                    )}
                </div>
                {isStreaming && (
                    <div className="mt-1 text-xs text-blue-500">
                        <span>回答中... (内容长度: {content?.length || 0})</span>
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


const ChatMessages: React.FC = () => {
    const {
        messages,
        streamingMessageId,
        partialResponse,
        isLoadingMessages,
        setMessages,
        sendMessage,
        initialMessage,
        setInitialMessage
    } = useChatContext();
    const router = useRouter();
    const searchParams = useSearchParams();
    const firstMsg = searchParams.get('firstMsg');
    const params = useParams();
    const dialogId = params.id as string;
    const hasSentFirstMsg = useRef(false);

    // 尝试从sessionStorage恢复initialMessage
    useEffect(() => {
        if (!initialMessage && !hasSentFirstMsg.current) {
            try {
                const pendingMessage = sessionStorage.getItem('pendingInitialMessage');
                if (pendingMessage) {
                    console.log("[ChatMessages] 从sessionStorage恢复初始消息:", pendingMessage);
                    setInitialMessage(pendingMessage);
                    // 清除，避免重复使用
                    sessionStorage.removeItem('pendingInitialMessage');
                }
            } catch (e) {
                console.error("[ChatMessages] 读取sessionStorage失败:", e);
            }
        }
    }, [initialMessage, setInitialMessage]);

    // Effect for logging
    useEffect(() => {
        console.log("[ChatMessages] Render/Update. Messages:", messages.length, "Streaming:", !!streamingMessageId, "Loading:", isLoadingMessages);
        console.log("[ChatMessages] Initial message:", initialMessage);
    }, [messages, streamingMessageId, isLoadingMessages, initialMessage]);

    // Effect for sending first message (from URL params or initialMessage)
    useEffect(() => {
        // 如果已经发送过，不再处理
        if (hasSentFirstMsg.current) {
            console.log("[ChatMessages] 已经发送过初始消息，跳过");
            return;
        }

        console.log("[ChatMessages] 检查是否需要发送初始消息:", {
            isLoading: isLoadingMessages,
            firstMsg,
            initialMessage,
            messagesCount: messages.length
        });

        // 如果还在加载消息，等待加载完成
        if (isLoadingMessages) {
            console.log("[ChatMessages] 消息正在加载中，等待加载完成再发送初始消息");
            return;
        }

        // 确保有对话ID
        if (!dialogId) {
            console.log("[ChatMessages] 无对话ID，跳过发送初始消息");
            return;
        }

        // 处理两种可能的首条消息来源
        const messageToSend = firstMsg || initialMessage;

        if (messageToSend) {
            console.log("[ChatMessages] 准备发送第一条消息:", messageToSend);

            // 设置标记表示已经处理过初始消息
            hasSentFirstMsg.current = true;

            // 添加一个小延迟确保loadChatHistory已完成处理
            setTimeout(() => {
                console.log("[ChatMessages] 开始发送初始消息:", messageToSend);

                // 发送正式消息
                sendMessage(dialogId, messageToSend)
                    .then(success => {
                        console.log("[ChatMessages] 初始消息发送结果:", success ? "成功" : "失败");
                    })
                    .catch(err => {
                        console.error("[ChatMessages] 发送初始消息出错:", err);
                    });

                // 如果消息来源是initialMessage，清除initialMessage
                if (initialMessage) {
                    console.log("[ChatMessages] 清除initialMessage");
                    setInitialMessage(null);
                }
            }, 500); // 添加500ms延迟确保历史消息加载完成
        } else {
            console.log("[ChatMessages] 没有初始消息需要发送");
        }
    }, [firstMsg, initialMessage, dialogId, isLoadingMessages, sendMessage, setInitialMessage, messages.length]);

    // Effect for scrolling to bottom (optional, 可以放在 ChatPage)
    useEffect(() => {
        // 这里可以加入滚动到底部的逻辑
        // ...
    }, [messages]);

    return (
        <div className="flex flex-col gap-4 md:px-6 overflow-y-auto h-full">
            {isLoadingMessages ? (
                <div className="flex justify-center items-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                    <span className="ml-2">加载消息中...</span>
                </div>
            ) : messages.length > 0 ? (
                messages.map((message) => (
                    <ChatMessageItem
                        key={message.id}
                        message={message}
                        isStreaming={message.id === streamingMessageId}
                    />
                ))
            ) : (
                <div className="text-center text-gray-500 p-4">
                    暂无消息
                </div>
            )}

            <div className="fixed bottom-20 right-4 bg-black/50 text-white p-2 rounded text-xs">
                流式消息ID: {streamingMessageId ? streamingMessageId.substring(0, 8) + '...' : '无'} |
                消息数量: {messages.length} |
                加载状态: {isLoadingMessages ? '加载中' : '已加载'}
            </div>
        </div>
    );
};

export default ChatMessages; 