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
    currentIsReasoning: boolean;
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
        currentIsReasoning: false,
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
            role: isReason ? MessageType.ReasonReply : MessageType.Assistant,
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
            currentIsReasoning: isReason,
            error: null,
            isUsingKbForCurrentMessage: isUsingKB
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
                // 检查是否被中止
                if (abortControllerRef.current?.signal.aborted) {
                    reader.cancel();
                    break;
                }
                
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
                                        ? {
                                            ...msg,
                                            id: data.id,
                                            role: prev.currentIsReasoning ? MessageType.ReasonReply : MessageType.Assistant,
                                            isThinking: prev.currentIsReasoning || msg.isThinking
                                        }
                                        : msg
                                )
                            }));
                        } else if (data.type === 'reasoning') {
                            const chunk = typeof data.chunk === 'string' ? data.chunk : '';
                            updateState(prev => {
                                const nextReasoning = prev.currentReasoning + chunk;
                                return {
                                    currentReasoning: nextReasoning,
                                    isStreaming: true,
                                    messages: prev.messages.map(msg =>
                                        msg.id === prev.currentMessageId
                                            ? {
                                                ...msg,
                                                thinkingContent: nextReasoning,
                                                isThinking: true,
                                                role: MessageType.ReasonReply
                                            }
                                            : msg
                                    )
                                };
                            });
                        } else if (data.type === 'transition') {
                            const message = typeof data.message === 'string' ? data.message : '';
                            updateState(prev => {
                                const separator = prev.currentReasoning.length > 0 && message ? '\n' : '';
                                const nextReasoning = prev.currentReasoning + (message ? `${separator}${message}` : '');
                                return {
                                    currentReasoning: nextReasoning,
                                    isStreaming: true,
                                    messages: prev.messages.map(msg =>
                                        msg.id === prev.currentMessageId
                                            ? {
                                                ...msg,
                                                thinkingContent: nextReasoning,
                                                isThinking: true,
                                                role: MessageType.ReasonReply
                                            }
                                            : msg
                                    )
                                };
                            });
                        } else if (data.type === 'content') {
                            updateState(prev => ({
                                currentContent: prev.currentContent + data.chunk,
                                isStreaming: true,
                                messages: prev.messages.map(msg =>
                                    msg.id === prev.currentMessageId
                                        ? {
                                            ...msg,
                                            content: prev.currentContent + data.chunk,
                                            thinkingContent: prev.currentReasoning,
                                            isThinking: prev.currentReasoning.length > 0,
                                            role: prev.currentIsReasoning ? MessageType.ReasonReply : msg.role
                                        }
                                        : msg
                                )
                            }));
                        } else if (data.type === 'done' || data.done) {
                            updateState(prev => {
                                // 先保存当前内容，再清空
                                const finalContent = prev.currentContent;
                                const finalReasoning = prev.currentReasoning;
                                
                                return {
                                    isStreaming: false,
                                    currentContent: '',
                                    currentReasoning: '',
                                    currentMessageId: null,
                                    currentIsReasoning: false,
                                    messages: prev.messages.map(msg =>
                                        msg.id === prev.currentMessageId
                                            ? {
                                                ...msg,
                                                content: finalContent,
                                                thinkingContent: finalReasoning,
                                                isThinking: finalReasoning.length > 0
                                            }
                                            : msg
                                    )
                                };
                            });
                            router.refresh();
                        } else if (data.type === 'kb_chunks') {
                            updateState(prev => ({
                                kbChunks: data.chunks,
                                isUsingKbForCurrentMessage: true
                            }));
                        } else if (data.type === 'reference') {
                            // 处理引用数据
                            updateState(prev => ({
                                messages: prev.messages.map(msg =>
                                    msg.id === prev.currentMessageId
                                        ? {
                                            ...msg,
                                            metadata: {
                                                ...msg.metadata,
                                                references: [
                                                    ...(msg.metadata?.references || []),
                                                    {
                                                        ref_id: data.ref_id,
                                                        doc_id: data.doc_id,
                                                        doc_name: data.doc_name,
                                                        content: data.content
                                                    }
                                                ]
                                            }
                                        }
                                        : msg
                                )
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
                currentIsReasoning: false,
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
        
        // 保存当前已接收的内容并清理状态
        updateState(prev => {
            const finalContent = prev.currentContent;
            const finalReasoning = prev.currentReasoning;
            
            return {
                isStreaming: false,
                currentContent: '',
                currentReasoning: '',
                currentMessageId: null,
                currentIsReasoning: false,
                messages: prev.messages.map(msg =>
                    msg.id === prev.currentMessageId
                        ? {
                            ...msg,
                            content: finalContent || '(已取消)',
                            thinkingContent: finalReasoning,
                            isThinking: finalReasoning.length > 0
                        }
                        : msg
                )
            };
        });
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