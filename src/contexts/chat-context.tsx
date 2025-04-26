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
    isSendingMessage: boolean;
    partialResponse: string | undefined;
    streamingMessageId: string | null;
    sendMessage: (content: string, dialogId: string) => Promise<boolean>;
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
        if (dialogId && dialogId !== processedDialogIdRef.current) {
            processedDialogIdRef.current = dialogId;
            console.log("Effect 1: Starting history load for new dialogId:", dialogId);
            setHistoryLoaded(false);
            setMessages([]);
            setIsLoadingMessages(true);

            try {
                const result = await fetchChatMessagesAction(dialogId);
                if (result.success) {
                    console.log("Effect 1: History fetch completed for dialogId:", dialogId);
                    setMessages(result.data as IMessage[]);
                    setHistoryLoaded(true);
                } else {
                    throw new Error(result.error || 'Failed to fetch messages');
                }
            } catch (error) {
                console.error("Effect 1: History fetch failed:", error);
                setHistoryLoaded(false);
            } finally {
                setIsLoadingMessages(false);
            }
        }
    }, []);

    // 处理流式响应
    useEffect(() => {
        if (streamingMessageId && partialResponse !== undefined) {
            console.log(`[Context] Updating streaming message: ${streamingMessageId}`);
            setMessages(prevMessages =>
                prevMessages.map((msg: IMessage) =>
                    msg.id === streamingMessageId
                        ? { ...msg, content: partialResponse }
                        : msg
                )
            );
        }
    }, [partialResponse, streamingMessageId]);

    // Updated sendMessage to use the registered setter for optimistic updates
    const sendMessage = useCallback(async (content: string, dialogId: string): Promise<boolean> => {
        if (!content.trim() || isSendingMessage || !dialogId || !session?.user?.id) return false;

        try {
            // 创建临时消息ID
            const userMessageId = `temp-user-${Date.now()}`;
            const assistantMessageId = `temp-assistant-${Date.now()}`;

            // 添加用户消息和空的AI回复到消息列表
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
                content: '',
                role: MessageType.Assistant,
                dialogId: dialogId,
                userId: session.user.id,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            // 更新本地消息和注册的对话消息
            setMessages(prev => [...prev, userMessage, assistantMessage]);
            if (messagesSettersRef.current[dialogId]) {
                messagesSettersRef.current[dialogId](prev => [...prev, userMessage, assistantMessage]);
            }

            // 设置正在流式传输的消息ID
            setStreamingMessageId(assistantMessageId);

            const result = await sendMessageWithSSE(dialogId, content, session.user.id);
            if (result.success) {
                return true;
            }
            return false;
        } catch (error) {
            console.error("发送消息失败:", error);
            return false;
        }
    }, [isSendingMessage, currentDialogId, sendMessageWithSSE, session?.user?.id]);

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
            currentDialogId
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
