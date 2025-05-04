'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Brain, Sparkles, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface ThinkingModeMessageProps {
    thinkingContent: string;
    isStreaming: boolean;
    streamingReasoning: string;
    streamingContent: string;
}

interface ParsedContent {
    content: string;
    reasoning: string;
}

/**
 * 思考模式消息组件 - 专门用于显示思维链和最终答案
 */
export function ThinkingModeMessage({
    thinkingContent,
    isStreaming,
    streamingReasoning,
    streamingContent
}: ThinkingModeMessageProps) {
    const [showReasoning, setShowReasoning] = useState(true);
    const [parsedContent, setParsedContent] = useState<ParsedContent>({
        content: '',
        reasoning: ''
    });

    useEffect(() => {
        console.log('ThinkingModeMessage useEffect:', {
            thinkingContent,
            isStreaming,
            streamingReasoning,
            streamingContent
        });

        if (isStreaming) {
            // 流式处理中，使用流式内容
            setParsedContent({
                content: streamingContent,
                reasoning: streamingReasoning
            });
        } else if (thinkingContent) {
            // 流式处理结束，使用最终内容
            setParsedContent({
                content: thinkingContent,
                reasoning: ''
            });
        }
    }, [thinkingContent, isStreaming, streamingContent, streamingReasoning]);

    // 确定要显示的内容
    const displayReasoningContent = isStreaming ? streamingReasoning : parsedContent.reasoning;
    const displayFinalContent = isStreaming ? streamingContent : parsedContent.content;

    console.log('ThinkingModeMessage render:', {
        displayReasoningContent,
        displayFinalContent,
        isStreaming
    });

    // 如果没有内容且正在流式传输，显示加载状态
    if (!displayReasoningContent && !displayFinalContent && isStreaming) {
        return (
            <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>正在思考中...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {/* 思考过程部分 */}
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

            {/* 最终答案部分 */}
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
                            {displayFinalContent}
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
    );
} 