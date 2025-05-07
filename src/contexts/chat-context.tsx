'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useTranslate } from '@/contexts/language-context';
import { useChatDialogContext } from '@/contexts/chat-dialog-context';
import { MessageType } from '@/constants/chat';
import { IMessage } from '@/types/message';
import { fetchChatMessagesAction, getChatMessageStream } from '@/actions/chat-message';

interface ChatState {
    messages: IMessage[];
    isLoading: boolean;
    isStreaming: boolean;
    currentMessageId: string | null;
    currentContent: string;
    currentReasoning: string;
    error: string | null;
    kbChunks: any[];
    isUsingKbForCurrentMessage: boolean;
}

interface ChatContextType extends ChatState {
    sendMessage: (chatDialogId: string, content: string, isReason?: boolean, isUsingKB?: boolean) => Promise<void>;
    stopStream: () => void;
    loadMessages: (chatDialogId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode; }) {
    const { t } = useTranslate('chat');
    const router = useRouter();
    const { data: session } = useSession();
    const { createChatDialog } = useChatDialogContext();
    const abortControllerRef = useRef<AbortController | null>(null);

    const [state, setState] = useState<ChatState>({
        messages: [],
        isLoading: true,
        isStreaming: false,
        currentMessageId: null,
        currentContent: '',
        currentReasoning: '',
        error: null,
        kbChunks: [],
        isUsingKbForCurrentMessage: false
    });

    const updateState = useCallback((updates: Partial<ChatState> | ((prev: ChatState) => Partial<ChatState>)) => {
        setState(prev => {
            const newUpdates = typeof updates === 'function' ? updates(prev) : updates;
            return { ...prev, ...newUpdates };
        });
    }, []);

    const loadMessages = useCallback(async (chatDialogId: string) => {
        if (!chatDialogId) return;

        updateState({ isLoading: true });
        try {
            const result = await fetchChatMessagesAction(chatDialogId);
            if (result.success && result.data) {
                const formattedMessages = result.data.map((msg: any) => ({
                    ...msg,
                    role: msg.role as MessageType,
                    createdAt: new Date(msg.createdAt),
                }));
                updateState({ messages: formattedMessages });
            }
        } catch (error) {
            console.error('加载消息失败:', error);
            toast.error(t('errors.loadMessagesFailed'));
        } finally {
            updateState({ isLoading: false });
        }
    }, [t, updateState]);

    const startStream = useCallback(async ({
        chatDialogId,
        content,
        userId,
        isReason = false,
        isUsingKB = false,
    }: {
        chatDialogId: string;
        content: string;
        userId: string;
        isReason?: boolean;
        isUsingKB?: boolean;
    }) => {
        // 添加 AI 助手的临时消息
        const tempAssistantMessage: IMessage = {
            id: `temp-assistant-${Date.now()}`,
            content: '正在思考中...',
            role: MessageType.Assistant,
            createdAt: new Date(),
            updatedAt: new Date(),
            userId: '',
            dialogId: chatDialogId || '',
            isThinking: isReason
        };

        // 更新状态，添加临时消息
        updateState(prev => ({
            messages: [...prev.messages, tempAssistantMessage],
            isStreaming: true,
            currentMessageId: tempAssistantMessage.id,
            currentContent: '',
            currentReasoning: '',
            error: null
        }));

        abortControllerRef.current = new AbortController();

        try {
            const stream = await getChatMessageStream(
                chatDialogId,
                content,
                userId,
                isReason,
                isUsingKB
            );

            const reader = stream.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;

                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.type === 'assistant_message_id') {
                            updateState(prev => ({
                                currentMessageId: data.id,
                                messages: prev.messages.map(msg =>
                                    msg.id === prev.currentMessageId
                                        ? { ...msg, id: data.id }
                                        : msg
                                )
                            }));
                        } else if (data.type === 'content') {
                            updateState(prev => ({
                                currentContent: prev.currentContent + data.chunk,
                                isStreaming: true,
                                messages: prev.messages.map(msg =>
                                    msg.id === prev.currentMessageId
                                        ? { ...msg, content: prev.currentContent + data.chunk }
                                        : msg
                                )
                            }));
                        } else if (data.type === 'reasoning') {
                            updateState(prev => ({
                                currentReasoning: prev.currentReasoning + data.chunk,
                                isStreaming: true
                            }));
                        } else if (data.type === 'transition') {
                            updateState(prev => ({
                                currentReasoning: prev.currentReasoning + data.message,
                                isStreaming: true
                            }));
                        } else if (data.error) {
                            updateState(prev => ({
                                error: data.error,
                                isStreaming: false,
                                messages: prev.messages.filter(msg => msg.id !== prev.currentMessageId)
                            }));
                        } else if (data.done) {
                            // 更新最后一条消息的内容
                            updateState(prev => ({
                                isStreaming: false,
                                currentContent: '',
                                currentReasoning: '',
                                currentMessageId: null,
                                messages: prev.messages.map(msg =>
                                    msg.id === prev.currentMessageId
                                        ? { ...msg, content: prev.currentContent }
                                        : msg
                                )
                            }));
                            router.refresh();
                        } else if (data.type === 'kb_chunks') {
                            updateState(prev => ({
                                kbChunks: data.chunks,
                                isUsingKbForCurrentMessage: true
                            }));
                        }
                    } catch (e) {
                        console.error('解析流数据失败:', e);
                    }
                }
            }
        } catch (error) {
            updateState(prev => ({
                error: error instanceof Error ? error.message : '流式处理失败',
                isStreaming: false,
                currentContent: '',
                currentReasoning: '',
                currentMessageId: null,
                messages: prev.messages.filter(msg => msg.id !== prev.currentMessageId)
            }));
        }
    }, [updateState, router, loadMessages]);

    const sendMessage = useCallback(async (chatDialogId: string, content: string, isReason: boolean = false, isUsingKB: boolean = false) => {
        if (!content.trim() || state.isStreaming) return;

        try {
            // 立即添加用户消息到状态中
            const userMessage: IMessage = {
                id: `temp-${Date.now()}`,
                content,
                role: MessageType.User,
                createdAt: new Date(),
                updatedAt: new Date(),
                userId: session?.user?.id || '',
                dialogId: chatDialogId || '',
                isThinking: false
            };

            updateState(prev => ({
                messages: [...prev.messages, userMessage]
            }));

            if (chatDialogId) {
                await startStream({
                    chatDialogId,
                    content,
                    userId: session?.user?.id || '',
                    isReason,
                    isUsingKB
                });
            } else if (session?.user) {
                const messageData = {
                    content,
                    isThinking: isReason,
                    isUsingKB: isUsingKB
                };
                sessionStorage.setItem('pendingInitialMessage', JSON.stringify(messageData));

                const newChatDialog = await createChatDialog({
                    name: content.slice(0, 10),
                    description: 'New Chat Dialog Description',
                    userId: session.user.id
                });

                if (newChatDialog?.id) {
                    router.push(`/chat/${newChatDialog.id}`);
                } else {
                    throw new Error('创建对话失败');
                }
            }
        } catch (error) {
            console.error('发送消息失败:', error);
            toast.error(t('errors.sendMessageFailed'));
        }
    }, [session, state.isStreaming, createChatDialog, router, t, startStream, updateState]);

    const stopStream = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        updateState({ isStreaming: false });
    }, [updateState]);


    return (
        <ChatContext.Provider value={{
            ...state,
            sendMessage,
            stopStream,
            loadMessages
        }}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChatContext() {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
} 