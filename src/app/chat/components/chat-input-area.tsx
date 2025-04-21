'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useChat } from '@/contexts/chat-context';
import { useTranslate } from '@/hooks/use-language';
import { useCreateChatDialog } from '@/hooks/use-chat';
import { useUser } from '@/contexts/user-context';
interface ChatInputAreaProps {
    dialogId?: string;
}

export function ChatInputArea({ dialogId }: ChatInputAreaProps) {
    const { createChatDialog } = useCreateChatDialog();
    const { userInfo } = useUser();
    const {
        inputValue,
        setInputValue,
        isSendingMessage,
        streamingMessageId,
        sendMessage,
        cancelStream
    } = useChat();
    const { t } = useTranslate('chat');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

        const messageToSend = inputValue;
        setInputValue('');
        if (!dialogId) {
            const newDialog = await createChatDialog({ name: messageToSend, userId: userInfo?.id || '' });
            await sendMessage(newDialog.id, messageToSend);
        }
        else {
            await sendMessage(dialogId, messageToSend);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="border-t p-4 bg-background shadow-inner">
            <div className="flex items-center space-x-2 max-w-4xl mx-auto">
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
                <Button onClick={cancelStream} disabled={!streamingMessageId} aria-label={t('cancelStream')}>
                    {t('cancelStream')}
                </Button>
            </div>
        </div>
    );
} 