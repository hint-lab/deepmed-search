"use client";
import { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect } from 'react';
import { useSendMessageWithSSE } from '@/hooks/use-chat';
import { IMessage } from '@/types/message';
import { MessageType } from '@/constants/chat';
import { useSession } from "next-auth/react";
import { fetchChatMessagesAction } from '@/actions/chat';

// Type for the message setter function
type MessagesSetter = React.Dispatch<React.SetStateAction<IMessage[]>>;

interface ChatContextType {
    initialMessage: string | null;
    setInitialMessage: (message: string | null) => void;
    isSendingMessage: boolean;
    partialResponse: string | undefined;
    streamingMessageId: string | null;
    sendMessage: (dialogId: string, content: string) => Promise<boolean>;
    cancelStream: () => void;
    registerMessagesSetter: (dialogId: string, setter: MessagesSetter | null) => void;
    messages: IMessage[];
    setMessages: React.Dispatch<React.SetStateAction<IMessage[]>>;
    isLoadingMessages: boolean;
    loadChatHistory: (dialogId: string) => Promise<void>;
    currentDialogId: string | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
    const { data: session } = useSession();
    const [messages, setMessages] = useState<IMessage[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(true);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const processedDialogIdRef = useRef<string | null>(null);
    const [currentDialogId, setCurrentDialogId] = useState<string | null>(null);
    const [initialMessage, setInitialMessage] = useState<string | null>(null);

    const {
        sendMessageWithSSE,
        isPending: isSendingMessage,
        partialResponse,
        cancelStream: sseCancelStream,
    } = useSendMessageWithSSE();
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

    // Use a ref to store setters mapped by dialogId
    const messagesSettersRef = useRef<Record<string, MessagesSetter>>({});

    // Function to register or unregister a setter
    const registerMessagesSetter = useCallback((dialogId: string, setter: MessagesSetter | null) => {
        console.log(`[Context] ${setter ? 'Registering' : 'Unregistering'} setter for dialog: ${dialogId}`);
        console.log(`[Context] Current setters:`, Object.keys(messagesSettersRef.current));
        if (setter) {
            messagesSettersRef.current[dialogId] = setter;
        } else {
            delete messagesSettersRef.current[dialogId];
        }
        console.log(`[Context] Updated setters:`, Object.keys(messagesSettersRef.current));
    }, []);

    // 加载聊天历史
    const loadChatHistory = useCallback(async (dialogId: string) => {
        if (dialogId) {
            // 存储当前的消息状态和流式ID
            const currentStreamingIdBeforeLoad = streamingMessageId;
            let optimisticAssistantMessage: IMessage | null = null;

            // 如果有正在流式传输的消息，将其保存
            if (currentStreamingIdBeforeLoad) {
                console.log("[ChatContext] 保存当前流式消息ID:", currentStreamingIdBeforeLoad);
                optimisticAssistantMessage = messages.find(msg => msg.id === currentStreamingIdBeforeLoad && msg.role === MessageType.Assistant) || null;
                console.log("[ChatContext] 找到流式消息:", optimisticAssistantMessage?.id);
            }

            // 如果切换到新对话，重置状态
            if (dialogId !== processedDialogIdRef.current) {
                processedDialogIdRef.current = dialogId;
                setStreamingMessageId(null); // 切换对话时清除流式ID
                console.log("[ChatContext] 切换到新对话，重置流式状态");
            }

            setCurrentDialogId(dialogId);
            console.log("[ChatContext] 开始加载历史消息，对话ID:", dialogId);
            setHistoryLoaded(false);
            // 切换对话时先清空消息，提供更好的用户体验
            setMessages([]);
            setIsLoadingMessages(true);

            try {
                console.log("[ChatContext] 调用fetchChatMessagesAction获取消息");
                const result = await fetchChatMessagesAction(dialogId);
                console.log("[ChatContext] fetchChatMessagesAction结果:", result);

                if (result.success) {
                    console.log("[ChatContext] 获取到历史消息，数量:", result.data.length);

                    const formattedMessages = result.data.map((msg: any) => ({
                        ...msg,
                        role: msg.role as MessageType,
                        createdAt: new Date(msg.createdAt),
                        updatedAt: new Date(msg.updatedAt ?? msg.createdAt) // Handle potential missing updatedAt
                    }));

                    console.log("[ChatContext] 格式化后消息数量:", formattedMessages.length);

                    // 仅当同一对话中保留流式消息
                    if (optimisticAssistantMessage && optimisticAssistantMessage.dialogId === dialogId) {
                        setMessages(() => {
                            const finalMessages = [optimisticAssistantMessage, ...formattedMessages];
                            console.log("[ChatContext] 设置最终消息，数量:", finalMessages.length, "包含流式消息:", !!optimisticAssistantMessage);
                            return finalMessages;
                        });
                        // 恢复流式ID
                        setStreamingMessageId(currentStreamingIdBeforeLoad);
                    } else {
                        // 新对话直接设置消息
                        setMessages(formattedMessages);
                    }
                    setHistoryLoaded(true);
                } else {
                    // 加载失败，仅保留可能的流式消息
                    console.log("[ChatContext] 加载历史失败，设置为空或流式消息");

                    // 仅当同一对话中保留流式消息
                    if (optimisticAssistantMessage && optimisticAssistantMessage.dialogId === dialogId) {
                        setMessages([optimisticAssistantMessage]);
                        // 恢复流式ID
                        setStreamingMessageId(currentStreamingIdBeforeLoad);
                    } else {
                        setMessages([]);
                    }
                    throw new Error(result.error || '获取消息失败');
                }
            } catch (error) {
                console.error("[ChatContext] 加载历史消息失败:", error);
                // 仅当同一对话中保留流式消息
                if (optimisticAssistantMessage && optimisticAssistantMessage.dialogId === dialogId) {
                    setMessages([optimisticAssistantMessage]);
                    // 恢复流式ID
                    setStreamingMessageId(currentStreamingIdBeforeLoad);
                } else {
                    setMessages([]);
                }
                setHistoryLoaded(false);
            } finally {
                setIsLoadingMessages(false);
            }
        } else {
            console.log("[ChatContext] 跳过加载历史消息，对话ID为空");
        }
    }, [messages, streamingMessageId]);

    // 处理流式响应
    useEffect(() => {
        // 只有当两个依赖都有值时才执行
        if (!streamingMessageId || partialResponse === undefined) {
            return;
        }

        console.log(`[Context StreamEffect] ** Streaming update triggered **`);
        console.log(`[Context StreamEffect] StreamingID: ${streamingMessageId}`);
        console.log(`[Context StreamEffect] PartialResponse: ${partialResponse.substring(0, 30)}...`);
        console.log(`[Context StreamEffect] Messages count: ${messages.length}`);

        // 为了确保即使在同一事件循环中也更新messages
        setTimeout(() => {
            setMessages(prevMessages => {
                // 记录调试信息
                console.log(`[Context StreamEffect] Updating messages. Message count: ${prevMessages.length}`);
                if (prevMessages.length > 0) {
                    console.log(`[Context StreamEffect] Message IDs:`,
                        prevMessages.map(m => `${m.id}(${m.role})`));
                }

                // 查找消息
                const messageIndex = prevMessages.findIndex(msg => msg.id === streamingMessageId);

                if (messageIndex === -1) {
                    console.warn(`[Context StreamEffect] ⚠️ Message NOT FOUND: ${streamingMessageId}`);
                    return prevMessages;
                }

                // 消息找到，检查内容是否需要更新
                console.log(`[Context StreamEffect] ✓ Found message at index ${messageIndex}`);
                const existingContent = prevMessages[messageIndex].content;

                // 只有内容不同时才更新
                if (existingContent !== partialResponse) {
                    console.log(`[Context StreamEffect] Content changed, updating message`);
                    const updatedMessages = [...prevMessages];
                    updatedMessages[messageIndex] = {
                        ...updatedMessages[messageIndex],
                        content: partialResponse
                    };
                    return updatedMessages;
                } else {
                    console.log(`[Context StreamEffect] Content unchanged, skipping update`);
                    return prevMessages;
                }
            });
        }, 0);
    }, [partialResponse, streamingMessageId, messages.length]);

    // Updated sendMessage to use the registered setter for optimistic updates
    const sendMessage = useCallback(async (dialogId: string, content: string): Promise<boolean> => {
        if (!content.trim() || isSendingMessage || !dialogId || !session?.user?.id) {
            console.log("SendMessage rejected:", {
                contentEmpty: !content.trim(),
                isSending: isSendingMessage,
                noDialogId: !dialogId,
                noUser: !session?.user?.id
            });
            return false;
        }

        try {
            console.log("[SendMessage] ▶ Starting:", { dialogId, contentLength: content.length });

            const timestamp = Date.now();
            const userMessageId = `temp-user-${timestamp}`;
            const assistantMessageId = `temp-assistant-${timestamp}`;
            console.log("[SendMessage] Generated IDs:", { userMessageId, assistantMessageId });

            const userMessage: IMessage = {
                id: userMessageId,
                content: content,
                role: MessageType.User,
                dialogId: dialogId,
                userId: session.user.id,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const assistantMessage: IMessage = {
                id: assistantMessageId,
                content: '', // Start empty
                role: MessageType.Assistant,
                dialogId: dialogId,
                userId: session.user.id,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            // 使用更可靠的方式同步更新状态
            // 等待下一个微任务以确保状态完全更新
            await Promise.resolve();

            // 添加消息并更新streaming ID
            console.log("[SendMessage] Adding messages and setting streamingID...");

            let messagesAdded = false;
            const addMessagesToState = () => {
                setMessages(prev => {
                    console.log("[SendMessage] Setting messages, current count:", prev.length);
                    messagesAdded = true;
                    return [...prev, userMessage, assistantMessage];
                });
            };

            // 首先添加消息
            addMessagesToState();

            // 短暂等待确保消息状态更新完成
            await new Promise(resolve => setTimeout(resolve, 50));

            // 设置streaming ID
            console.log("[SendMessage] Setting streaming ID to:", assistantMessageId);
            setStreamingMessageId(assistantMessageId);

            // 更新注册的setters
            if (messagesSettersRef.current[dialogId]) {
                messagesSettersRef.current[dialogId](prev => [...prev, userMessage, assistantMessage]);
                console.log("[SendMessage] Updated setter for dialog:", dialogId);
            } else {
                console.log("[SendMessage] No setter found for dialog:", dialogId);
            }

            // 调用SSE发送
            console.log("[SendMessage] Calling sendMessageWithSSE...");
            const result = await sendMessageWithSSE(dialogId, content, session.user.id);
            console.log("[SendMessage] SSE result:", result);

            return result.success;
        } catch (error) {
            console.error("[SendMessage] ❌ Error:", error);
            return false;
        } finally {
            // 延迟清除streamingMessageId (改为更长的延迟以确保所有数据都已处理)
            setTimeout(() => {
                console.log("[SendMessage] 🔚 Clearing streamingMessageId");
                setStreamingMessageId(null);
            }, 500);
        }
    }, [isSendingMessage, sendMessageWithSSE, session?.user?.id]);

    const cancelStream = useCallback(() => {
        console.log("[Context] Cancelling stream");
        sseCancelStream(); // Call the hook's cancel function
        const currentStreamingId = streamingMessageId;
        setStreamingMessageId(null); // Clear streaming state immediately

        // Remove the corresponding optimistic messages
        if (currentStreamingId) {
            const userMessageIdToRemove = currentStreamingId.replace('temp-assistant-', 'temp-user-');
            Object.values(messagesSettersRef.current).forEach(setter => {
                setter(prev => prev.filter(msg =>
                    msg.id !== currentStreamingId && msg.id !== userMessageIdToRemove
                ));
            });
        }
    }, [sseCancelStream, streamingMessageId]);

    return (
        <ChatContext.Provider value={{
            isSendingMessage,
            partialResponse,
            streamingMessageId,
            sendMessage,
            cancelStream,
            registerMessagesSetter,
            messages,
            setMessages,
            isLoadingMessages,
            loadChatHistory,
            currentDialogId,
            initialMessage,
            setInitialMessage,
        }}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChatContext() {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
}
