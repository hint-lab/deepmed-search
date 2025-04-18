'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreateChatDialog, useChatDialogList, useChatMessages, useSendMessageWithSSE } from '@/hooks/use-chat';
import ChatSidebar from '../components/chat-sidebar';
import ChatMessages from '../components/chat-messages';
import { useTranslate } from '@/hooks/use-language';
import { IMessage } from '@/types/db/message';
import { useUser } from '@/contexts/user-context';
import { MessageType } from '@/constants/chat';
import { useChat } from '@/contexts/chat-context';



export default function ChatPage() {
    const params = useParams();
    const router = useRouter();
    const dialogId = params.id as string;
    const { userInfo } = useUser();
    const { t } = useTranslate('chat');
    const { data: dialogs, isLoading: isLoadingDialogs } = useChatDialogList();
    const { data: messages, isLoading: isLoadingMessages, setData: setMessages, fetchChatMessages } = useChatMessages();
    const { createChatDialog, loading: isCreatingDialog } = useCreateChatDialog();
    const { sendMessageWithSSE, isLoading: isSendingMessage, partialResponse, cancelStream } = useSendMessageWithSSE();
    const [inputValue, setInputValue] = useState('');
    const [isProcessingFirstMessage, setIsProcessingFirstMessage] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
    const { initialMessage, setInitialMessage } = useChat();

    // 发送消息的通用函数
    const sendMessage = async (content: string) => {
        if (!content.trim() || isSendingMessage || isProcessingFirstMessage) return;

        const tempUserMessageId = `temp-user-${Date.now()}`;
        const tempAssistantMessageId = `temp-assistant-${Date.now()}`;

        const optimisticUserMessage: IMessage = {
            id: tempUserMessageId,
            content,
            role: MessageType.User,
            createdAt: new Date(),
            updatedAt: new Date(),
            dialogId: dialogId
        };

        const optimisticAssistantMessage: IMessage = {
            id: tempAssistantMessageId,
            content: '',
            role: MessageType.Assistant,
            createdAt: new Date(),
            updatedAt: new Date(),
            dialogId: dialogId
        };

        setMessages(prev => [...prev, optimisticUserMessage, optimisticAssistantMessage]);
        setStreamingMessageId(tempAssistantMessageId);

        if (!userInfo?.id) {
            console.error("用户未登录");
            setMessages(prev => prev.filter(msg =>
                msg.id !== tempUserMessageId && msg.id !== tempAssistantMessageId
            ));
            setStreamingMessageId(null);
            return;
        }

        try {
            console.log("开始 SSE 流式请求:", { dialogId, content });
            const result = await sendMessageWithSSE(dialogId, content, userInfo.id);
            console.log("SSE 请求完成:", result);

            if (!result.success) {
                console.error("流式消息发送失败:", result.error);
                setMessages(prev => prev.filter(msg =>
                    msg.id !== tempUserMessageId && msg.id !== tempAssistantMessageId
                ));
                return false;
            } else {
                console.log("流式消息完成，最终内容长度:", result.content?.length);
                if (result.content) {
                    setMessages(prev => prev.map(msg =>
                        msg.id === tempAssistantMessageId
                            ? { ...msg, content: result.content || '' }
                            : msg
                    ));
                }
                return true;
            }
        } catch (error) {
            console.error("发送流式消息失败:", error);
            setMessages(prev => prev.filter(msg =>
                msg.id !== tempUserMessageId && msg.id !== tempAssistantMessageId
            ));
            return false;
        } finally {
            setStreamingMessageId(null);
        }
    };

    useEffect(() => {
        console.log("dialogId", dialogId);

        // 先获取历史消息
        fetchChatMessages(dialogId).then(() => {
            // 获取完历史消息后，如果有初始消息则发送
            if (initialMessage && userInfo?.id) {
                console.log('处理初始消息:', initialMessage);
                sendMessage(initialMessage).finally(() => {
                    setInitialMessage(null); // 清除初始消息
                });
            }
        });
    }, [dialogId, initialMessage, userInfo?.id]);

    useEffect(() => {
        console.log("Messages", messages)
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

        const messageToSend = inputValue;
        setInputValue('');

        let currentDialogId = dialogId;

        if (!currentDialogId) {
            setIsProcessingFirstMessage(true);
            try {
                const defaultName = messageToSend.split(' ').slice(0, 5).join(' ') || t('newChat');
                if (!userInfo?.id) {
                    throw new Error("用户未登录");
                }
                const newDialog = await createChatDialog({ name: defaultName, userId: userInfo.id });

                if (!newDialog?.id) {
                    throw new Error("创建对话失败");
                }
                currentDialogId = newDialog.id;
                router.push(`/chat/${currentDialogId}`, { scroll: false });
            } catch (error) {
                console.error("创建对话失败:", error);
                setInputValue(messageToSend);
                return;
            } finally {
                setIsProcessingFirstMessage(false);
            }
        }

        sendMessage(messageToSend);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleCancelStream = () => {
        if (streamingMessageId) {
            cancelStream();
            setStreamingMessageId(null);
        }
    };

    const isLoadingInitialData = isLoadingMessages || isLoadingDialogs;
    const isSending = isSendingMessage || isProcessingFirstMessage;

    return (
        <div className="flex h-screen">
            <ChatSidebar dialogs={dialogs} isLoading={isLoadingDialogs} currentDialogId={dialogId} />
            <div className="flex flex-col flex-1 bg-muted/30 ">
                <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                    <div className="max-w-3xl mx-auto w-full space-y-4 pb-4">
                        {isLoadingInitialData && !messages.length ? (
                            <div className="space-y-4">
                                <Skeleton className="h-16 w-3/4 rounded-lg" />
                                <Skeleton className="h-16 w-3/4 self-end rounded-lg bg-primary/10 ml-auto" />
                                <Skeleton className="h-16 w-1/2 rounded-lg" />
                            </div>
                        ) : (
                            <ChatMessages messages={messages} />
                        )}
                    </div>
                </ScrollArea>
                <div className="border-t p-4 bg-background shadow-inner">
                    <div className="max-w-3xl mx-auto w-full flex items-center space-x-2">
                        <Input
                            placeholder={t('messagePlaceholder')}
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            disabled={isSendingMessage || isProcessingFirstMessage}
                            className="flex-1 resize-none"
                        />
                        <Button onClick={handleSendMessage} disabled={isSendingMessage || isProcessingFirstMessage || !inputValue.trim()} aria-label={t('send')}>
                            {isSendingMessage ? (
                                <span className="animate-spin inline-block w-4 h-4 border-[3px] border-current border-t-transparent text-white rounded-full" role="status" aria-label="loading"></span>
                            ) : t('send')}
                        </Button>
                        <Button onClick={handleCancelStream} disabled={!streamingMessageId} aria-label={t('cancelStream')}>
                            {t('cancelStream')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
