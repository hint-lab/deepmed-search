'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BrainIcon, StopCircleIcon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatContext } from '@/contexts/chat-context';
import { useState, useRef } from 'react';
import { useChatDialogContext } from '@/contexts/chat-dialog-context';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
// Define props interface
interface ChatInputProps {
    dialogId: string | undefined;
}

export function ChatInputArea({ dialogId }: ChatInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = useState('');
    const [isThinkingMode, setIsThinkingMode] = useState(false);
    const [showThinkingAnimation, setShowThinkingAnimation] = useState(false);
    const { data: session } = useSession();
    const router = useRouter();
    const {
        isStreaming,
        sendMessage,
        stopStream
    } = useChatContext();

    const { createChatDialog } = useChatDialogContext();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const toggleThinkingMode = () => {
        setIsThinkingMode(prev => {
            const newValue = !prev;
            if (newValue) {
                setShowThinkingAnimation(true);
                setTimeout(() => setShowThinkingAnimation(false), 1000);
            }
            return newValue;
        });

        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }, 0);
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isStreaming) return;
        if (dialogId) {
            await sendMessage(dialogId, inputValue, isThinkingMode);
        } else {
            const dialog = await createChatDialog({ name: inputValue, userId: session?.user?.id ?? '' });

            if (dialog) {
                sendMessage(dialog.id, inputValue, isThinkingMode);
            }
            router.push(`/chat/${dialog?.id}`);

        }
        setInputValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className={cn(
            "w-full p-1 border-t transition-all duration-300 relative bg-white/90 dark:bg-gray-900/90",
            isThinkingMode && "border-blue-200 dark:border-blue-800"
        )}>
            {showThinkingAnimation && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-72 h-72 bg-blue-400/10 rounded-md filter blur-3xl animate-pulse" />
                </div>
            )}

            <div className="w-full py-2.5 px-2 relative z-10">
                <div className="flex items-center space-x-2">
                    {/* 思考模式按钮 */}
                    <Button
                        type="button"
                        variant={isThinkingMode ? "outline" : "ghost"}
                        size="sm"
                        onClick={toggleThinkingMode}
                        className={cn(
                            "rounded-md h-10 px-3 transition-all",
                            isThinkingMode
                                ? "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900"
                                : "bg-gray-100 text-gray-600 hover:bg-blue-100 dark:text-gray-400"
                        )}
                    >
                        <BrainIcon className={cn(
                            "w-5 h-5",
                            isThinkingMode ? "text-blue-500" : "text-gray-500"
                        )} />
                        <span className="ml-2">深度思考</span>
                    </Button>

                    {/* 输入框 */}
                    <div className="flex-1 relative">
                        {isThinkingMode && (
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center z-10 ">
                                <Sparkles className="w-4 h-4 text-blue-500" />
                            </div>
                        )}
                        <Input
                            ref={inputRef}
                            placeholder={
                                dialogId
                                    ? (isThinkingMode ? '输入思考内容...' : '你想知道什么？')
                                    : '请输入内容，系统将自动新建对话'
                            }
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            disabled={isStreaming}
                            className={cn(
                                "h-10 transition-all duration-200",
                                isThinkingMode
                                    ? "pl-10 border-blue-200 focus-visible:ring-blue-400 focus-visible:border-blue-400 bg-blue-50/50 text-blue-900 dark:border-blue-800 dark:bg-blue-900/10"
                                    : "border-gray-200 dark:border-gray-700",
                                isStreaming ? "bg-gray-100 text-gray-400" : ""
                            )}
                        />
                    </div>

                    {/* 发送按钮 */}
                    <Button
                        onClick={handleSendMessage}
                        disabled={isStreaming || !inputValue.trim()}
                        aria-label={isThinkingMode ? '思考' : (dialogId ? '发送' : '新建对话并发送')}
                        variant={isThinkingMode ? "outline" : "default"}
                        size="sm"
                        className={cn(
                            "rounded-md h-10 transition-all px-4",
                            isThinkingMode
                                ? "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900"
                                : ""
                        )}
                    >
                        {isStreaming ? (
                            <span className="animate-spin inline-block w-4 h-4 border-[3px] border-current border-t-transparent rounded-md" role="status" aria-label="loading"></span>
                        ) : (
                            <span>{dialogId ? '发送' : '新建对话并发送'}</span>
                        )}
                    </Button>

                    {/* 取消流式传输按钮 */}
                    {isStreaming && (
                        <Button
                            onClick={stopStream}
                            aria-label="取消"
                            variant="outline"
                            size="sm"
                            className="rounded-md h-10 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                        >
                            <StopCircleIcon className="w-4 h-4 mr-1" />
                            <span>取消</span>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
} 