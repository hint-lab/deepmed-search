"use client";
import { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';
import { useSendMessageWithSSE } from '@/hooks/use-chat';
import { useUser } from './user-context'; // Assuming user context is needed
import { toast } from 'sonner';
import { IMessage } from '@/types/message'; // Assuming IMessage type is needed
import { MessageType } from '@/constants/chat'; // Assuming MessageType is needed

// Type for the message setter function
type MessagesSetter = React.Dispatch<React.SetStateAction<IMessage[]>>;

interface ChatContextType {
    initialMessage: string | null;
    setInitialMessage: (message: string | null) => void;
    inputValue: string;
    setInputValue: (value: string) => void;
    isSendingMessage: boolean;
    partialResponse: string | undefined; // Expose partial response if needed by ChatMessages directly
    streamingMessageId: string | null;
    sendMessage: (dialogId: string, content: string, knowledgeBaseId?: string) => Promise<boolean>; // Simplified signature
    cancelStream: () => void;
    registerMessagesSetter: (dialogId: string, setter: MessagesSetter | null) => void; // New: Register setter
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
    const [initialMessage, setInitialMessage] = useState<string | null>(null);
    const [inputValue, setInputValue] = useState('');
    const { userInfo } = useUser();
    const {
        sendMessageWithSSE,
        isLoading: isSendingMessage,
        partialResponse,
        cancelStream: sseCancelStream, // Renamed to avoid conflict
    } = useSendMessageWithSSE();
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

    // Use a ref to store setters mapped by dialogId
    const messagesSettersRef = useRef<Record<string, MessagesSetter>>({});

    // Function to register or unregister a setter
    const registerMessagesSetter = useCallback((dialogId: string, setter: MessagesSetter | null) => {
        console.log(`[Context] ${setter ? 'Registering' : 'Unregistering'} setter for dialog: ${dialogId}`);
        if (setter) {
            messagesSettersRef.current[dialogId] = setter;
        } else {
            delete messagesSettersRef.current[dialogId];
        }
    }, []);

    // Updated sendMessage to use the registered setter for optimistic updates
    const sendMessage = useCallback(async (
        dialogId: string,
        content: string,
        knowledgeBaseId?: string
    ): Promise<boolean> => {
        if (!content.trim() || isSendingMessage) return false;

        const setMessages = messagesSettersRef.current[dialogId];
        if (!setMessages) {
            console.error(`[Context] No messages setter registered for dialog ${dialogId}`);
            toast.error("无法发送消息：内部错误");
            return false;
        }

        const tempUserMessageId = `temp-user-${Date.now()}`;
        const tempAssistantMessageId = `temp-assistant-${Date.now()}`;

        if (!userInfo?.id) {
            console.error("用户未登录");
            toast.error("请先登录再发送消息");
            return false;
        }

        // Perform optimistic update using registered setter
        const optimisticUserMessage: IMessage = { id: tempUserMessageId, content, role: MessageType.User, createdAt: new Date(), updatedAt: new Date(), dialogId: dialogId, userId: userInfo.id };
        const optimisticAssistantMessage: IMessage = { id: tempAssistantMessageId, content: '', role: MessageType.Assistant, createdAt: new Date(), updatedAt: new Date(), dialogId: dialogId, userId: userInfo.id };
        console.log('[Context] Performing optimistic update & setting streaming ID:', tempAssistantMessageId);
        setMessages(prev => [...prev, optimisticUserMessage, optimisticAssistantMessage]);
        setStreamingMessageId(tempAssistantMessageId);

        try {
            console.log("[Context] 开始 SSE 流式请求:", { dialogId, content, userId: userInfo.id });
            const result = await sendMessageWithSSE(dialogId, content, userInfo.id, knowledgeBaseId);
            console.log("[Context] SSE 请求完成:", result);

            if (!result.success) {
                const isAbortError = result.error?.includes('aborted') || result.error?.includes('cancel');
                if (!isAbortError) {
                    console.error("[Context] 流式消息发送失败:", result.error);
                    toast.error("发送消息失败" + (result.error ? `: ${result.error}` : ''));
                    // Remove optimistic messages on failure
                    setMessages(prev => prev.filter(msg => msg.id !== tempUserMessageId && msg.id !== tempAssistantMessageId));
                } else {
                    console.log("[Context] 流式消息请求被取消:", result.error);
                    // Cancellation removes messages via cancelStream handler
                }
                return false;
            } else {
                console.log("[Context] 流式消息完成，最终内容长度:", result.content?.length);
                // Update final message content via partialResponse effect in page
                if (result.content !== undefined) {
                    setMessages(prev => prev.map(msg =>
                        msg.id === tempAssistantMessageId
                            ? { ...msg, content: result.content }
                            : msg
                    ));
                }
                return true;
            }
        } catch (error) {
            console.error("[Context] 发送流式消息失败:", error);
            toast.error("发送消息时发生未知错误");
            // Remove optimistic messages on error
            setMessages(prev => prev.filter(msg => msg.id !== tempUserMessageId && msg.id !== tempAssistantMessageId));
            return false;
        } finally {
            console.log('[Context] Clearing streaming ID in finally block. ID was:', tempAssistantMessageId);
            setStreamingMessageId(null);
        }
    }, [isSendingMessage, sendMessageWithSSE, userInfo]);

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
            initialMessage,
            setInitialMessage,
            inputValue,
            setInputValue,
            isSendingMessage,
            partialResponse, // Keep exposing partial response
            streamingMessageId,
            sendMessage,
            cancelStream,
            registerMessagesSetter // Expose registration function
        }}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
}
