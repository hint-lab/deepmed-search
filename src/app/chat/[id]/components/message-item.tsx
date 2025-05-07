'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useTranslate } from '@/contexts/language-context';
import { IMessage } from '@/types/message';
import dayjs from 'dayjs';
import { MessageType } from '@/constants/chat';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Brain, Sparkles, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface ChatMessageItemProps {
    message: IMessage,
    isStreaming: boolean,
    isThinking: boolean,
    streamingState?: {
        reasoningContent: string;
        content: string;
    }
}

function ChatMessageItem({
    message,
    isStreaming,
    isThinking,
    streamingState = { reasoningContent: '', content: '' }
}: ChatMessageItemProps) {
    const [showReasoning, setShowReasoning] = useState(true);
    const [expandedIndexes, setExpandedIndexes] = useState<number[]>([]);

    const normalizedRole =
        message.role === MessageType.User || message.role === 'reason'
            ? MessageType.User
            : MessageType.Assistant;
    const isUser = normalizedRole === MessageType.User;

    // Determine if this specific message should be rendered in thinking mode
    const isThinkingModeRender = isThinking || message.role === 'reasonReply';

    // Determine content to display
    const displayReasoningContent = isStreaming && isThinkingModeRender
        ? streamingState.reasoningContent
        : (isThinkingModeRender ? (message.thinkingContent || '') : '');

    // Use message.content directly for the final content display logic
    // The [think] icon logic will be handled in the JSX
    const displayFinalContent = isStreaming && isThinkingModeRender
        ? streamingState.content
        : message.content; // Reverted to use message.content directly

    const createdAt = message.createdAt;
    const messageId = message.id;
    const timestamp = createdAt ? dayjs(createdAt).format('HH:mm') : '--:--';

    useEffect(() => {
        console.log("message.metadata", message.metadata)
    }, [])

    const toggleExpand = (idx: number) => {
        setExpandedIndexes(prev =>
            prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
        );
    };

    return (
        <div key={messageId} className={cn("flex gap-2 mb-4", isUser ? "justify-end" : "justify-start")}>
            {!isUser && (
                <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        AI
                    </AvatarFallback>
                </Avatar>
            )}
            <div className={cn(
                "rounded-lg max-w-[85%] md:max-w-[75%] break-words shadow-sm border",
                "p-3",
                isUser
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "bg-muted text-card-foreground border-border",
                isStreaming && !isUser && isThinkingModeRender ? "border-blue-500 border-2" : ""
            )}>
                {isThinkingModeRender ? (
                    <div className="flex flex-col gap-3">
                        {!displayReasoningContent && !displayFinalContent && isStreaming && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>正在思考中...</span>
                            </div>
                        )}

                        {displayReasoningContent && (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Brain className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="text-sm font-medium text-muted-foreground">思考过程</h3>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowReasoning(!showReasoning)}
                                        className="h-6 px-2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showReasoning ? (
                                            <ChevronUp className="h-4 w-4" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                                {showReasoning && (
                                    <div className="prose prose-sm dark:prose-invert max-w-none bg-muted/50 p-3 rounded-md">
                                        <ReactMarkdown>
                                            {displayReasoningContent}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        )}

                        {displayFinalContent && (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                                    <h3 className="text-sm font-medium text-muted-foreground">最终答案</h3>
                                </div>
                                <div className={cn(
                                    "prose prose-sm dark:prose-invert max-w-none",
                                    isStreaming && "animate-blinking-cursor"
                                )}>
                                    <ReactMarkdown>
                                        {renderWithReferences(displayFinalContent)}
                                    </ReactMarkdown>
                                </div>
                                {isStreaming && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        <span>思考中...</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        {message.role === 'reason' && (
                            <div className="flex items-center gap-1.5">
                                <Sparkles className="h-4 w-4 text-purple-500 dark:text-purple-400 shrink-0" />
                                <div className={cn(
                                    "prose prose-sm dark:prose-invert max-w-none",
                                    isStreaming && !isUser && "animate-blinking-cursor"
                                )}>
                                    <ReactMarkdown>
                                        {displayFinalContent || ''}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        )}

                        {message.role !== 'reason' && (
                            <div className={cn(
                                "prose prose-sm dark:prose-invert max-w-none",
                                isStreaming && !isUser && "animate-blinking-cursor"
                            )}>
                                <ReactMarkdown>
                                    {displayFinalContent || ''}
                                </ReactMarkdown>
                            </div>
                        )}
                        {message.metadata?.kbChunks && (
                            <div className="mt-2 text-xs text-gray-500">
                                <details className="group">
                                    <summary className="cursor-pointer font-medium transition-colors hover:text-blue-500">
                                        来源：{message.metadata.kbName}（{message.metadata.kbChunks.length} 个片段）
                                    </summary>
                                    <div className="mt-2 space-y-2 pl-4 border-l-2 border-gray-200">
                                        {message.metadata.kbChunks.map((chunk, i) => {
                                            const expanded = expandedIndexes.includes(i);
                                            return (
                                                <div
                                                    key={i}
                                                    id={`kb-ref-${i + 1}`}
                                                    className="p-2 bg-gray-50 dark:bg-gray-800 rounded-md border-l-4 border-transparent group-hover:border-blue-400 transition-all cursor-pointer"
                                                    onClick={() => toggleExpand(i)}
                                                >
                                                    <div className="font-medium text-xs mb-1 text-gray-700 dark:text-gray-200 flex items-center">
                                                        {chunk.docName}
                                                        <span className="ml-2 text-blue-400">{expanded ? '收起' : '展开'}</span>
                                                    </div>
                                                    <div className={`text-xs text-gray-600 dark:text-gray-300 ${expanded ? '' : 'line-clamp-3'}`}>
                                                        <ReactMarkdown
                                                            components={{
                                                                a: ({ node, ...props }) => (
                                                                    <a
                                                                        {...props}
                                                                        className="text-blue-600 underline break-all"
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                    />
                                                                ),
                                                            }}
                                                        >
                                                            {chunk.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </details>
                            </div>
                        )}
                    </div>
                )}
            </div>
            {isUser && (
                <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-xs bg-muted">
                        U
                    </AvatarFallback>
                </Avatar>
            )}

        </div>
    );
}

function renderWithReferences(answer: string) {
    // 替换 [1]、[2] 为锚点链接
    const replaced = answer.replace(/\[(\d+)\]/g, (match, p1) => {
        return `<a href="#kb-ref-${p1}" class="text-blue-500 underline">[${p1}]</a>`;
    });
    return <ReactMarkdown children={replaced} components={{
        a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />
    }} />;
}

export default ChatMessageItem;