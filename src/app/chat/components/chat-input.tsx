'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTranslate } from '@/contexts/language-context';
import { useChatInput } from '@/hooks/use-chat-input';


export function ChatInputArea() {
    const {
        inputValue,
        handleInputChange,
        handleSendMessage,
        handleKeyDown,
        isSendingMessage,
        streamingMessageId,
        cancelStream
    } = useChatInput();
    const { t } = useTranslate('chat');

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
                <Button
                    onClick={() => handleSendMessage()}
                    disabled={isSendingMessage || !inputValue.trim()}
                    aria-label={t('send')}
                >
                    {isSendingMessage ? (
                        <span className="animate-spin inline-block w-4 h-4 border-[3px] border-current border-t-transparent text-white rounded-full" role="status" aria-label="loading"></span>
                    ) : t('send')}
                </Button>
                <Button
                    onClick={cancelStream}
                    disabled={!streamingMessageId}
                    aria-label={t('cancelStream')}
                >
                    {t('cancelStream')}
                </Button>
            </div>
        </div>
    );
} 