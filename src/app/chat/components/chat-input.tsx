'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTranslate } from '@/contexts/language-context';
import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useChatContext } from '@/contexts/chat-context';
import { useDialogContext } from '@/contexts/dialog-context';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function ChatInputArea() {
    const { t } = useTranslate('chat');
    const params = useParams();
    const dialogIdFromParams = params?.id as string | undefined;

    const [inputValue, setInputValue] = useState('');
    const {
        isSendingMessage,
        streamingMessageId,
        sendMessage: contextSendMessage,
        cancelStream,
        setInitialMessage,
        currentDialogId
    } = useChatContext();
    const { createDialog } = useDialogContext();
    const { data: session } = useSession();
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    }, []);

    const handleSendMessage = useCallback(async () => {
        const messageContent = inputValue.trim();
        console.log("[ChatInput] 处理发送消息:", messageContent);

        if (!messageContent || isSendingMessage) {
            console.log("[ChatInput] 消息为空或正在发送中，跳过");
            return;
        }

        if (dialogIdFromParams) {
            // 已有对话，直接发送
            console.log("[ChatInput] 在现有对话中发送消息:", dialogIdFromParams);
            const success = await contextSendMessage(dialogIdFromParams, messageContent);
            if (success) {
                console.log("[ChatInput] 发送成功，清空输入框");
                setInputValue('');
            }
            else {
                console.error("[ChatInput] 发送失败");
                toast.error(t('errors.sendMessageFailed'));
            }
        } else if (session?.user) {
            // 没有对话，新建并跳转
            console.log("[ChatInput] 创建新对话并设置初始消息");

            try {
                // 使用sessionStorage备份初始消息
                sessionStorage.setItem('pendingInitialMessage', messageContent);
                console.log("[ChatInput] 已在sessionStorage保存初始消息");

                const newDialog = await createDialog({
                    name: messageContent.slice(0, 10),
                    description: 'New Dialog Description',
                    userId: session.user.id
                });

                if (newDialog && newDialog.id) {
                    console.log("[ChatInput] 对话创建成功，ID:", newDialog.id);
                    setInputValue('');
                    setInitialMessage(messageContent);
                    console.log("[ChatInput] 初始消息已设置，准备跳转");

                    // 跳转前再检查一次
                    console.log("[ChatInput] Context中的initialMessage:", messageContent);

                    router.push(`/chat/${newDialog.id}`);
                } else {
                    console.error("[ChatInput] 创建对话失败");
                    toast.error(t('errors.sendMessageFailed'));
                }
            } catch (error) {
                console.error("[ChatInput] 处理过程中出错:", error);
                toast.error(t('errors.sendMessageFailed'));
            }
        } else {
            console.error("[ChatInput] 用户未登录");
            toast.error(t('errors.sendMessageFailed'));
        }
    }, [
        inputValue,
        isSendingMessage,
        contextSendMessage,
        dialogIdFromParams,
        createDialog,
        session,
        router,
        t,
        setInitialMessage
    ]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    }, [handleSendMessage]);

    useEffect(() => {
        console.log("ChatInputArea rendered. Dialog ID from params:", dialogIdFromParams, "Current Dialog ID from context:", currentDialogId);
    }, [dialogIdFromParams, currentDialogId]);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [dialogIdFromParams, currentDialogId]);

    return (
        <div className="border-t p-4 bg-background shadow-inner">
            <div className="flex items-center space-x-2 max-w-4xl mx-auto">
                <Input
                    ref={inputRef}
                    placeholder={t('messagePlaceholder')}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    disabled={isSendingMessage}
                    className={`flex-1 resize-none ${isSendingMessage ? 'bg-gray-100 text-gray-400' : ''}`}
                />
                <Button
                    onClick={handleSendMessage}
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