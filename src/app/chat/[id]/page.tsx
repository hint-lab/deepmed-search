'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useDialogList, useConversation, useSendMessage } from '@/hooks/use-chat';
import ChatSidebar from '../components/chat-sidebar';
import ChatMessages from '../components/chat-messages';
import { useTranslate } from '@/hooks/use-language';
import { Message } from '@/types/db/chat';

// Define a type for local message state, allowing partial data for optimistic updates
type LocalMessage = Partial<Message> & { id: string; content: string; role: string; createdAt: Date };

export default function ChatPage() {
    const params = useParams();
    const router = useRouter();
    const dialogId = params.id as string | undefined;
    const { t } = useTranslate('chat');
    const { data: dialogs, isLoading: isLoadingDialogs } = useDialogList();
    const { data: messages, isLoading: isLoadingMessages } = useConversation(dialogId || '');
    const { sendMessage, isPending: isSendingMessage } = useSendMessage();
    const [inputValue, setInputValue] = useState('');
    const [currentMessages, setCurrentMessages] = useState<LocalMessage[]>([]);
    const [isProcessingFirstMessage, setIsProcessingFirstMessage] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messages) {
            setCurrentMessages(messages as LocalMessage[]);
        }
    }, [messages]);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [currentMessages]);

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

        const messageToSend = inputValue;
        const tempUserMessageId = `temp-${Date.now()}`;

        const optimisticUserMessage: LocalMessage = {
            id: tempUserMessageId,
            content: messageToSend,
            role: 'user',
            createdAt: new Date(),
        };

        setCurrentMessages(prev => [...prev, optimisticUserMessage]);
        setInputValue('');

        let currentDialogId = dialogId;

        try {
            if (!currentDialogId) {
                setIsProcessingFirstMessage(true);
                const defaultName = messageToSend.split(' ').slice(0, 5).join(' ') || t('newChat');
                const newDialog = await createDialog({ name: defaultName });

                if (!newDialog?.id) {
                    throw new Error("Failed to create dialog");
                }
                currentDialogId = newDialog.id;
                router.push(`/chat/${currentDialogId}`, { scroll: false });
                setCurrentMessages(prev => prev.map(msg =>
                    msg.id === tempUserMessageId ? { ...msg, dialogId: currentDialogId } : msg
                ));
            }

            const aiResponse = await sendMessage(currentDialogId!, messageToSend);

            setCurrentMessages(prev => prev.filter(msg => msg.id !== tempUserMessageId));
            router.refresh();

        } catch (error) {
            console.error("Failed to send message or create dialog:", error);
            setCurrentMessages(prev => prev.filter(msg => msg.id !== tempUserMessageId));
            setInputValue(messageToSend);
        } finally {
            setIsProcessingFirstMessage(false);
        }
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(event.target.value);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    };

    const isLoading = isLoadingMessages || isLoadingDialogs;
    const isSending = isSendingMessage || isProcessingFirstMessage;

    return (
        <div className="flex h-[calc(100vh-3.5rem)]">
            <ChatSidebar dialogs={dialogs} isLoading={isLoadingDialogs} currentDialogId={dialogId} />
            <div className="flex flex-col flex-1 bg-muted/30">
                {dialogId ? (
                    <>
                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-4 pb-4">
                                {isLoadingMessages ? (
                                    <div className="space-y-4">
                                        <Skeleton className="h-16 w-3/4" />
                                        <Skeleton className="h-16 w-3/4 self-end bg-primary/10" />
                                        <Skeleton className="h-16 w-1/2" />
                                    </div>
                                ) : (
                                    <ChatMessages messages={messages} />
                                )}
                            </div>
                        </ScrollArea>
                        <div className="border-t p-4 bg-background shadow-inner">
                            <div className="flex items-center space-x-2">
                                <Input
                                    placeholder={t('messagePlaceholder')}
                                    value={inputValue}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    disabled={isSendingMessage}
                                    className="flex-1 resize-none"
                                />
                                <Button onClick={handleSendMessage} disabled={isSendingMessage || !inputValue.trim()} aria-label={t('send')}>
                                    {isSendingMessage ? (
                                        <span className="animate-spin inline-block w-4 h-4 border-[3px] border-current border-t-transparent text-white rounded-full" role="status" aria-label="loading"></span>
                                    ) : t('send')}
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">
                            {t('startNewChat')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
