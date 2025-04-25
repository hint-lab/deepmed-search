'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import ChatMessages from '../components/chat-messages';
import { useUser } from '@/contexts/user-context';
import { MessageType } from '@/constants/chat';
import { useChat } from '@/contexts/chat-context';

export default function ChatPage() {
    const params = useParams();
    const dialogId = params.id as string;
    const { userInfo } = useUser();
    const { chatMessages, isPending, setChatMessages, fetchChatMessages } = useChat();
    const {
        initialMessage,
        setInitialMessage,
        registerMessagesSetter,
        partialResponse,
        streamingMessageId,
        sendMessage
    } = useChat();
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const processedDialogIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (dialogId) {
            registerMessagesSetter(dialogId, setMessages);
        }
        return () => {
            if (dialogId) {
                registerMessagesSetter(dialogId, null);
            }
        };
    }, [dialogId, registerMessagesSetter, setMessages]);

    useEffect(() => {
        if (streamingMessageId && partialResponse !== undefined) {
            setMessages(prevMessages =>
                prevMessages.map(msg =>
                    msg.id === streamingMessageId
                        ? { ...msg, content: partialResponse }
                        : msg
                )
            );
        }
    }, [partialResponse, streamingMessageId, setMessages]);

    // Effect to load history
    useEffect(() => {
        if (dialogId && dialogId !== processedDialogIdRef.current) {
            // Update the ref immediately upon deciding to fetch for the new dialogId
            processedDialogIdRef.current = dialogId;
            console.log("Effect 1: Starting history load for new dialogId:", dialogId);
            setHistoryLoaded(false); // Set loading state
            setMessages([]); // Clear previous messages
            fetchChatMessages(dialogId).then(() => {
                console.log("Effect 1: History fetch completed for dialogId:", dialogId);
                setHistoryLoaded(true); // Set loaded state
            }).catch(error => {
                console.error("Effect 1: History fetch failed:", error);
                // Optionally handle error state, e.g., show an error message
                setHistoryLoaded(false); // Reset loading state on error maybe?
            });
        }
        // Cleanup or dependency logic can go here if needed, 
        // but the main loop prevention is moving the ref update.
    }, [dialogId, fetchChatMessages, setMessages]); // Dependencies remain the same

    useEffect(() => {
        if (historyLoaded && initialMessage && userInfo?.id && dialogId) {
            console.log("Effect 2: Processing initial message:", initialMessage);

            const initialMessageAlreadySent = messages.some(
                (msg) => msg.role === MessageType.User && msg.content === initialMessage
            );
            console.log("Effect 2: Initial message already sent?", initialMessageAlreadySent);

            if (!initialMessageAlreadySent) {
                console.log('Effect 2: Sending initial message via context.');
                sendMessage(dialogId, initialMessage);
            } else {
                console.log('Effect 2: Initial message found in history, skipping send.');
            }
            setInitialMessage(null);
        } else if (historyLoaded && initialMessage) {
            console.log("Effect 2: Clearing initial message (no user/dialog info).");
            setInitialMessage(null);
        }
    }, [historyLoaded, initialMessage, messages, userInfo?.id, dialogId, setInitialMessage, sendMessage]);


    return (
        <div className="flex flex-col flex-1 p-4 bg-muted/30 overflow-hidden">
            {isLoadingMessages && messages.length === 0 ? (
                <div className="space-y-4 p-4">
                    <Skeleton className="h-16 w-3/4" />
                    <Skeleton className="h-16 w-3/4 ml-auto" />
                    <Skeleton className="h-16 w-2/3" />
                </div>
            ) : (
                <ChatMessages messages={messages} streamingMessageId={streamingMessageId} />
            )}
        </div>
    );
}
