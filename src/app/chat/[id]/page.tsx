'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreateChatDialog, useChatDialogList, useConversation, useSendMessageWithSSE } from '@/hooks/use-chat';
import ChatSidebar from '../components/chat-sidebar';
import ChatMessages from '../components/chat-messages';
import { useTranslate } from '@/hooks/use-language';
import { Message } from '@/types/db/chat';
import { useUser } from '@/contexts/user-context';
import { MessageType } from '@/constants/chat';

type LocalMessage = {
    id: string;
    content: string;
    role: MessageType;
    createdAt: Date;
    dialogId?: string;
};

type DatabaseMessage = {
    id: string;
    content: string;
    role: MessageType;
    createdAt: string | Date;
    updatedAt: string | Date;
    userId: string;
    dialogId: string;
};

export default function ChatPage() {
    const params = useParams();
    const router = useRouter();
    const dialogId = params.id as string | undefined;
    const { userInfo } = useUser();
    const { t } = useTranslate('chat');
    const { data: dialogs, isLoading: isLoadingDialogs } = useChatDialogList();
    const { data: initialMessages, isLoading: isLoadingMessages } = useConversation(dialogId || '');
    const { createChatDialog, loading: isCreatingDialog } = useCreateChatDialog();
    const { sendMessageWithSSE, isLoading: isSendingMessage, partialResponse, cancelStream } = useSendMessageWithSSE();
    const [inputValue, setInputValue] = useState('');
    const [currentMessages, setCurrentMessages] = useState<LocalMessage[]>([]);
    const [isProcessingFirstMessage, setIsProcessingFirstMessage] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

    useEffect(() => {
        if (initialMessages) {
            const formattedMessages = initialMessages.map(msg => ({
                ...msg,
                role: msg.role as MessageType,
                createdAt: new Date(msg.createdAt),
            })) as LocalMessage[];
            setCurrentMessages(formattedMessages);
        }
    }, [initialMessages]);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [currentMessages]);

    useEffect(() => {
        if (streamingMessageId && partialResponse) {
            setCurrentMessages(prev => prev.map(msg =>
                msg.id === streamingMessageId
                    ? { ...msg, content: partialResponse }
                    : msg
            ));

            if (scrollAreaRef.current) {
                scrollAreaRef.current.scrollTo({
                    top: scrollAreaRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }
    }, [partialResponse, streamingMessageId]);

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isSendingMessage || isProcessingFirstMessage) return;

        const messageToSend = inputValue;
        const tempUserMessageId = `temp-user-${Date.now()}`;
        const tempAssistantMessageId = `temp-assistant-${Date.now()}`;

        const optimisticUserMessage: LocalMessage = {
            id: tempUserMessageId,
            content: messageToSend,
            role: MessageType.User,
            createdAt: new Date(),
            dialogId: dialogId
        };

        const optimisticAssistantMessage: LocalMessage = {
            id: tempAssistantMessageId,
            content: '',
            role: MessageType.Assistant,
            createdAt: new Date(),
            dialogId: dialogId
        };

        setCurrentMessages(prev => [...prev, optimisticUserMessage, optimisticAssistantMessage]);
        setInputValue('');
        setStreamingMessageId(tempAssistantMessageId);

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
                setCurrentMessages(prev => prev.filter(msg =>
                    msg.id !== tempUserMessageId && msg.id !== tempAssistantMessageId
                ));
                setInputValue(messageToSend);
                setIsProcessingFirstMessage(false);
                setStreamingMessageId(null);
                return;
            } finally {
                setIsProcessingFirstMessage(false);
            }
        }

        if (!currentDialogId || !userInfo?.id) {
            console.error("对话ID缺失或用户未登录");
            setCurrentMessages(prev => prev.filter(msg =>
                msg.id !== tempUserMessageId && msg.id !== tempAssistantMessageId
            ));
            setInputValue(messageToSend);
            setStreamingMessageId(null);
            return;
        }

        try {
            console.log("开始 SSE 流式请求:", { currentDialogId, messageToSend });
            const result = await sendMessageWithSSE(currentDialogId, messageToSend, userInfo.id);
            console.log("SSE 请求完成:", result);

            if (!result.success) {
                console.error("流式消息发送失败:", result.error);
                setCurrentMessages(prev => prev.filter(msg =>
                    msg.id !== tempUserMessageId && msg.id !== tempAssistantMessageId
                ));
                setInputValue(messageToSend);
            } else {
                console.log("流式消息完成，最终内容长度:", result.content?.length);
                if (result.content && streamingMessageId) {
                    setCurrentMessages(prev => prev.map(msg =>
                        msg.id === streamingMessageId
                            ? { ...msg, content: result.content || '' }
                            : msg
                    ));
                }
            }
        } catch (error) {
            console.error("发送流式消息失败:", error);
            setCurrentMessages(prev => prev.filter(msg =>
                msg.id !== tempUserMessageId && msg.id !== tempAssistantMessageId
            ));
            setInputValue(messageToSend);
        } finally {
            setStreamingMessageId(null);
        }
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
            <div className="flex flex-col flex-1 bg-muted/30">
                <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                    <div className="max-w-3xl mx-auto w-full space-y-4 pb-4">
                        {isLoadingInitialData && !currentMessages.length ? (
                            <div className="space-y-4">
                                <Skeleton className="h-16 w-3/4 rounded-lg" />
                                <Skeleton className="h-16 w-3/4 self-end rounded-lg bg-primary/10 ml-auto" />
                                <Skeleton className="h-16 w-1/2 rounded-lg" />
                            </div>
                        ) : (
                            <ChatMessages messages={currentMessages} />
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
                            disabled={isSending}
                            className="flex-1 resize-none"
                        />
                        <Button onClick={handleSendMessage} disabled={isSending || !inputValue.trim()} aria-label={t('send')}>
                            {isSending ? (
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
