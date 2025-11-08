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
import ReactDOM from 'react-dom';
import { ReactElement, ReactNode } from 'react';

interface ChatMessageItemProps {
    message: IMessage,
    isStreaming: boolean,
    isThinking: boolean,
    streamingState?: {
        reasoningContent: string;
        content: string;
    }
}

// 定义引用相关的接口
interface Reference {
    reference_id: number;
    doc_id: string;
    doc_name: string;
    content: string;
    type?: string;
}

function ChatMessageItem({
    message,
    isStreaming,
    isThinking,
    streamingState = { reasoningContent: '', content: '' }
}: ChatMessageItemProps) {
    const { t } = useTranslate('chat');
    const [showReasoning, setShowReasoning] = useState(true);
    const [expandedIndexes, setExpandedIndexes] = useState<number[]>([]);
    const [selectedReference, setSelectedReference] = useState<Reference | null>(null);
    const [forceUpdate, setForceUpdate] = useState(0); // 强制更新计数器

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

    const toggleExpand = (idx: number) => {
        setExpandedIndexes(prev =>
            prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
        );
    };

    const renderMessage = (msg: IMessage): React.ReactNode => {
        if (!msg.metadata?.references) return msg.content;

        // 创建一个正则表达式，匹配所有引用
        const refRegex = /\[(\d+)\]/g;

        // 预处理内容，记录所有引用
        const references: { id: number, index: number }[] = [];
        let match;
        const content = msg.content;
        while ((match = refRegex.exec(content)) !== null) {
            references.push({
                id: parseInt(match[1]),
                index: match.index
            });
        }

        // 自定义组件渲染
        const ReferenceComponent = ({ children, ...props }: any) => {
            // 检查文本是否是引用格式
            const text = children.toString();
            const match = text.match(/^\[(\d+)\]$/);

            if (match) {
                const refNum = parseInt(match[1]);

                // 尝试查找对应的引用
                let reference = msg.metadata?.references?.find(
                    (r: Reference) => r.reference_id === refNum
                );

                // 如果找不到，尝试使用索引
                if (!reference && refNum > 0 && msg.metadata?.references && refNum <= msg.metadata.references.length) {
                    reference = msg.metadata.references[refNum - 1];
                }

                // 如果找到引用，返回可点击的链接
                return (
                    <span className="inline-flex items-center whitespace-nowrap">
                        <a
                            href="#"
                            className="inline-flex items-center text-blue-500 hover:text-blue-700 cursor-pointer px-1 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 mx-0.5"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();

                                if (reference) {
                                    setSelectedReference(reference);
                                    setForceUpdate(prev => prev + 1);
                                } else if (msg.metadata?.references && msg.metadata.references.length > 0) {
                                    setSelectedReference(msg.metadata.references[0]);
                                    setForceUpdate(prev => prev + 1);
                                }
                            }}
                        >
                            <span className="h-2 w-2 rounded-full bg-blue-500 mr-1"></span>
                            <span className="text-xs font-medium">{match[1]}</span>
                        </a>
                    </span>
                );
            }

            // 如果不是引用，直接返回原始内容
            return <span>{children}</span>;
        };

        return (
            <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                    components={{
                        p: ({ children, ...props }) => (
                            <p {...props}>{children}</p>
                        ),
                        a: (props) => (
                            <a {...props} className="text-blue-600 underline" target="_blank" rel="noopener noreferrer" />
                        ),
                        // 处理文本并找出引用
                        text: ({ children }) => {
                            if (typeof children !== 'string') return <>{children}</>;

                            const text = children as string;
                            const parts = [];
                            let lastIndex = 0;
                            let currentMatch;

                            // 在文本中查找所有引用
                            const regex = /\[(\d+)\]/g;
                            while ((currentMatch = regex.exec(text)) !== null) {
                                // 添加引用前的文本
                                if (currentMatch.index > lastIndex) {
                                    parts.push(text.substring(lastIndex, currentMatch.index));
                                }

                                // 获取引用编号
                                const refId = parseInt(currentMatch[1]);

                                // 尝试查找引用
                                let reference = msg.metadata?.references?.find(
                                    (r: Reference) => r.reference_id === refId
                                );

                                // 如果找不到，尝试使用索引
                                if (!reference && refId > 0 && msg.metadata?.references && refId <= msg.metadata.references.length) {
                                    reference = msg.metadata.references[refId - 1];
                                }

                                // 添加引用链接
                                parts.push(
                                    <span key={`ref-${refId}-${currentMatch.index}`} className="inline-flex items-center whitespace-nowrap">
                                        <a
                                            href="#"
                                            className="inline-flex items-center text-blue-500 hover:text-blue-700 cursor-pointer px-1 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 mx-0.5"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();

                                                if (reference) {
                                                    setSelectedReference(reference);
                                                    setForceUpdate(prev => prev + 1);
                                                } else if (msg.metadata?.references && msg.metadata.references.length > 0) {
                                                    setSelectedReference(msg.metadata.references[0]);
                                                    setForceUpdate(prev => prev + 1);
                                                }
                                            }}
                                        >
                                            <span className="h-2 w-2 rounded-full bg-blue-500 mr-1"></span>
                                            <span className="text-xs font-medium">{currentMatch[1]}</span>
                                        </a>
                                    </span>
                                );

                                lastIndex = currentMatch.index + currentMatch[0].length;
                            }

                            // 添加最后剩余的文本
                            if (lastIndex < text.length) {
                                parts.push(text.substring(lastIndex));
                            }

                            return <>{parts}</>;
                        }
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>
        );
    };

    // 计算相似度分数的函数
    const getSimilarityScore = (chunk: any): string => {
        // 首先检查是否有自定义属性similarity
        if (chunk.similarity !== undefined && chunk.similarity !== null) {
            const simNum = typeof chunk.similarity === 'string' ? parseFloat(chunk.similarity) : Number(chunk.similarity);
            if (!isNaN(simNum)) return simNum.toFixed(3);
        }

        // 然后检查标准属性distance
        if (chunk.distance !== undefined && chunk.distance !== null) {
            const distNum = typeof chunk.distance === 'string' ? parseFloat(chunk.distance) : Number(chunk.distance);
            if (!isNaN(distNum)) return (1 - distNum).toFixed(3);
        }

        return t('noData');
    };

    // 获取排序键
    const getSortKey = (chunk: any): number => {
        if (chunk.similarity !== undefined && chunk.similarity !== null) {
            const simNum = typeof chunk.similarity === 'string' ? parseFloat(chunk.similarity) : Number(chunk.similarity);
            if (!isNaN(simNum)) return -simNum; // 相似度越高排序越靠前，所以用负值
        }

        if (chunk.distance !== undefined && chunk.distance !== null) {
            const distNum = typeof chunk.distance === 'string' ? parseFloat(chunk.distance) : Number(chunk.distance);
            if (!isNaN(distNum)) return distNum; // 距离越小排序越靠前
        }

        return 1; // 默认值
    };

    // 计算进度条宽度
    const getSimilarityWidth = (chunk: any): string => {
        // 首先检查是否有自定义属性similarity
        if (chunk.similarity !== undefined && chunk.similarity !== null) {
            const simNum = typeof chunk.similarity === 'string' ? parseFloat(chunk.similarity) : Number(chunk.similarity);
            if (!isNaN(simNum)) return `${Math.max(5, simNum * 100)}%`;
        }

        // 然后检查标准属性distance
        if (chunk.distance !== undefined && chunk.distance !== null) {
            const distNum = typeof chunk.distance === 'string' ? parseFloat(chunk.distance) : Number(chunk.distance);
            if (!isNaN(distNum)) return `${Math.max(5, (1 - distNum) * 100)}%`;
        }

        return '5%'; // default value
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
                                <span>{t('thinking')}</span>
                            </div>
                        )}

                        {displayReasoningContent && (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Brain className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="text-sm font-medium text-muted-foreground">{t('thinkingProcess')}</h3>
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
                                    <h3 className="text-sm font-medium text-muted-foreground">{t('finalAnswer')}</h3>
                                </div>
                                <div className={cn(
                                    "prose prose-sm dark:prose-invert max-w-none",
                                    isStreaming && "animate-blinking-cursor"
                                )}>
                                    <ReactMarkdown>
                                        {typeof displayFinalContent === 'string' ? displayFinalContent : ''}
                                    </ReactMarkdown>
                                </div>
                                {isStreaming && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        <span>{t('thinkingNow')}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        {message.role === 'reason' && (
                            <div className="flex items-center gap-1.5">
                                <Sparkles className="h-4 w-4 text-cyan-500 dark:text-cyan-400 shrink-0" />
                                <div className={cn(
                                    "prose prose-sm dark:prose-invert max-w-none",
                                    isStreaming && !isUser && "animate-blinking-cursor"
                                )}>
                                    <ReactMarkdown>
                                        {typeof displayFinalContent === 'string' ? displayFinalContent : ''}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        )}

                        {message.role !== 'reason' && (
                            <>

                                <div
                                    className={cn(
                                        "prose prose-sm dark:prose-invert max-w-none",
                                        isStreaming && !isUser && "animate-blinking-cursor"
                                    )}
                                >
                                    {message.metadata?.references ?
                                        renderMessage(message)
                                        : (
                                            <ReactMarkdown>
                                                {typeof displayFinalContent === 'string' ? displayFinalContent : ''}
                                            </ReactMarkdown>
                                        )}
                                </div>
                            </>
                        )}
                        {message.metadata?.kbChunks && (
                            <div className="mt-2 text-xs text-gray-500">
                                <details className="group">
                                    <summary className="cursor-pointer font-medium transition-colors hover:text-blue-500">
                                        {t('source')}：{message.metadata.kbName}（{message.metadata.kbChunks.length} {t('chunks')}）
                                    </summary>
                                    <div className="flex justify-between items-center text-xs text-gray-400 mt-1 mb-2 px-1">
                                        <span>{t('sortedBySimilarity')}</span>
                                        <span>{t('similarityRange')}</span>
                                    </div>
                                    <div className="mt-2 space-y-2 pl-4 border-l-2 border-gray-200">
                                        {message.metadata.kbChunks
                                            .slice()
                                            .sort((a, b) => getSortKey(a) - getSortKey(b))
                                            .map((chunk, i) => {
                                                const expanded = expandedIndexes.includes(i);
                                                return (
                                                    <div
                                                        key={i}
                                                        id={`kb-ref-${i + 1}`}
                                                        className="p-2 bg-gray-50 dark:bg-gray-800 rounded-md hover:border-l-6 border-transparent group-hover:border-blue-400 transition-all cursor-pointer"
                                                    >
                                                        <div className="font-medium text-xs mb-1 text-gray-700 dark:text-gray-200 flex items-center">
                                                            <span onClick={() => toggleExpand(i)} className="flex-grow cursor-pointer">
                                                                {decodeURIComponent(chunk.docName.split("?X-Amz-Algorithm")[0])}
                                                                <span className="ml-2 text-blue-400 whitespace-nowrap">{expanded ? t('collapse') : t('expand')}</span>
                                                            </span>
                                                            <span className="ml-auto px-2 py-0.5 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs whitespace-nowrap">
                                                                {t('similarity')}: {getSimilarityScore(chunk)}
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full mb-2">
                                                            <div
                                                                className="h-1 bg-blue-500 rounded-full"
                                                                style={{
                                                                    width: getSimilarityWidth(chunk)
                                                                }}
                                                            ></div>
                                                        </div>
                                                        <div
                                                            className={`text-xs text-gray-600 dark:text-gray-300 ${expanded ? '' : 'line-clamp-3'}`}
                                                            onClick={(e) => {
                                                                // 仅当点击的不是链接时才展开/折叠
                                                                if ((e.target as HTMLElement).tagName !== 'A') {
                                                                    toggleExpand(i);
                                                                }
                                                            }}
                                                        >
                                                            <ReactMarkdown
                                                                components={{
                                                                    a: ({ node, ...props }) => (
                                                                        <a
                                                                            {...props}
                                                                            className="text-blue-600 underline break-all"
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation(); // 阻止冒泡，防止触发外层div的点击事件
                                                                            }}
                                                                        />
                                                                    ),
                                                                }}
                                                            >
                                                                {typeof chunk.content === 'string' ? chunk.content : ''}
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

            {/* 引用详情弹窗 - 使用创建DOM元素的方式 */}
            {selectedReference && ReactDOM.createPortal(
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                    onClick={() => setSelectedReference(null)}
                >
                    <div
                        className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                                {t('referenceDetails')} {selectedReference.reference_id && `[${selectedReference.reference_id}]`}
                            </h3>
                            <button
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                onClick={() => setSelectedReference(null)}
                                aria-label={t('close')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        {selectedReference.doc_name && (
                            <div className="mb-2 text-sm text-gray-600 dark:text-gray-300">
                                <strong>{t('sourceLabel')}:</strong> {selectedReference.doc_name}
                            </div>
                        )}
                        <div className="prose prose-sm dark:prose-invert max-w-none bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
                            <ReactMarkdown>
                                {selectedReference.content || t('noContent')}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

function renderWithReferences(answer: string) {
    // 替换 [1]、[2] 为锚点链接
    const replaced = answer.replace(/\[(\d+)\]/g, (match, p1) => {
        return `<a href="#kb-ref-${p1}" class="text-blue-500 underline">[${p1}]</a>`;
    });
    return <ReactMarkdown
        // @ts-ignore children属性可以是string类型
        children={replaced}
        components={{
            a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />
        }}
    />;
}

export default ChatMessageItem;