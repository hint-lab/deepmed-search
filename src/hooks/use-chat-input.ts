"use client";
import { useState, useCallback } from 'react';
import { useChatContext } from '@/contexts/chat-context';
import { useDialogContext } from '@/contexts/dialog-context';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

export function useChatInput() {
    const [inputValue, setInputValue] = useState('');
    const {
        isSendingMessage,
        streamingMessageId,
        sendMessage: contextSendMessage,
        cancelStream
    } = useChatContext();
    const { currentDialog, createDialog } = useDialogContext();
    const { data: session } = useSession();
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    }, []);

    const handleSendMessage = useCallback(async (initialInput?: string) => {

        if (!initialInput && !inputValue.trim() || isSendingMessage) return;

        try {
            const input = initialInput || inputValue.trim();
            if (currentDialog?.id) {
                const success = await contextSendMessage(input, currentDialog?.id);
                if (success) {
                    setInputValue('');
                }
            }
            else {
                if (session?.user) {
                    const newDialog = await createDialog({
                        name: input.slice(0, 10).toString(),
                        description: 'New Dialog Description',
                        userId: session.user.id
                    });
                    if (newDialog) {
                        const success = await contextSendMessage(input, newDialog.id);
                        if (success) {
                            setInputValue('');
                        }
                    }
                }
            }
        } catch (error) {
            console.error("发送消息失败:", error);
            toast.error('消息发送失败');
        }
    }, [inputValue, isSendingMessage, contextSendMessage]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    }, [handleSendMessage]);

    return {
        inputValue,
        handleInputChange,
        handleSendMessage,
        handleKeyDown,
        isSendingMessage,
        streamingMessageId,
        cancelStream
    };
}


