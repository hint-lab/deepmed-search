'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useTranslate } from '@/contexts/language-context';
import { IMessage } from '@/types/message';
import dayjs from 'dayjs';
import { MessageType } from '@/constants/chat';
import { useEffect, useRef, useState } from 'react';
import MarkdownContent from '@/components/extensions/markdown-content';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Brain, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import ReactDOM from 'react-dom';
import { ReactElement, ReactNode } from 'react';

interface ChatMessageItemProps {
    message: IMessage,
    isStreaming: boolean,
    isThinking: boolean,
    streamingState?: {
        reasoningContent: string;
        content: string;
    },
    currentKbChunks?: any[],
    isUsingKb?: boolean
}

// 定义引用相关的接口
interface Reference {
    reference_id: number;
    doc_id: string;
    docId?: string;
    doc_name: string;
    docName?: string;
    content: string;
    type?: string;
    chunk_id?: string | null;
    chunkId?: string | null;
    chunk_content?: string | null;
}

function ChatMessageItem({
    message,
    isStreaming,
    isThinking,
    streamingState = { reasoningContent: '', content: '' },
    currentKbChunks,
    isUsingKb
}: ChatMessageItemProps) {
    const { t } = useTranslate('chat');
    const [showReasoning, setShowReasoning] = useState<boolean>(isStreaming);
    const userToggleRef = useRef(false);
    const [expandedIndexes, setExpandedIndexes] = useState<number[]>([]);
    const [selectedReference, setSelectedReference] = useState<Reference | null>(null);
    const [selectedKbChunk, setSelectedKbChunk] = useState<any | null>(null);
    const [forceUpdate, setForceUpdate] = useState(0); // 强制更新计数器
    const [referenceDocInfo, setReferenceDocInfo] = useState<{ fileUrl?: string | null; markdownUrl?: string | null; type?: string | null }>({ fileUrl: null, markdownUrl: null, type: null });
    const [isReferenceDocLoading, setIsReferenceDocLoading] = useState(false);
    const [referenceDocError, setReferenceDocError] = useState<string | null>(null);

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
    // 在思考模式下，优先使用流式传输的内容，否则使用消息内容
    const displayFinalContent = isStreaming && isThinkingModeRender
        ? streamingState.content
        : (isThinkingModeRender ? (message.content || '') : message.content);

    const createdAt = message.createdAt;
    const messageId = message.id;
    const timestamp = createdAt ? dayjs(createdAt).format('HH:mm') : '--:--';

    const toggleExpand = (idx: number) => {
        setExpandedIndexes(prev =>
            prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
        );
    };

    useEffect(() => {
        setShowReasoning(isStreaming);
        userToggleRef.current = false;
    }, [message.id, isStreaming]);

    useEffect(() => {
        if (isStreaming) {
            setShowReasoning(true);
        } else if (!userToggleRef.current && message.thinkingContent) {
            setShowReasoning(false);
        }
    }, [isStreaming, message.thinkingContent]);

    useEffect(() => {
        const docId = selectedReference?.doc_id || (selectedReference as any)?.docId;
        if (!docId) {
            setReferenceDocInfo({ fileUrl: null, markdownUrl: null, type: null });
            setReferenceDocError(null);
            return;
        }

        let cancelled = false;
        const fetchDocInfo = async () => {
            try {
                setIsReferenceDocLoading(true);
                setReferenceDocError(null);
                const res = await fetch(`/api/document/${docId}`);
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.error || `加载文档信息失败 (status ${res.status})`);
                }
                const data = await res.json();
                if (!cancelled) {
                    setReferenceDocInfo({
                        fileUrl: data.file_url || null,
                        markdownUrl: data.markdown_url || null,
                        type: data.type || null
                    });
                }
            } catch (err) {
                if (!cancelled) {
                    console.error('[Chat] 加载参考文档信息失败:', err);
                    setReferenceDocError(err instanceof Error ? err.message : '加载文档信息失败');
                    setReferenceDocInfo({ fileUrl: null, markdownUrl: null, type: null });
                }
            } finally {
                if (!cancelled) {
                    setIsReferenceDocLoading(false);
                }
            }
        };

        fetchDocInfo();

        return () => {
            cancelled = true;
        };
    }, [selectedReference?.doc_id]);

    const handleToggleReasoning = () => {
        userToggleRef.current = true;
        setShowReasoning(prev => !prev);
    };

    const sanitizeReference = (ref: any): Reference => ({
        reference_id: ref.reference_id ?? ref.ref_id ?? 0,
        doc_id: ref.doc_id || ref.docId || '',
        doc_name: ref.doc_name || ref.docName || t('unknownDocument', '未知文档'),
        content: ref.content || ref.chunk_content || '',
        type: ref.type,
        chunk_id: ref.chunk_id ?? ref.chunkId ?? null,
        chunk_content: ref.chunk_content ?? ref.content ?? ''
    });

    const getReferenceById = (msg: IMessage, refNum: number): Reference | undefined => {
        if (!msg.metadata?.references) return undefined;
        const refs = msg.metadata.references;
        const directMatch = refs.find((r: any) =>
            r.reference_id === refNum ||
            (r as any).ref_id === refNum
        );
        if (directMatch) return sanitizeReference(directMatch);
        if (refNum > 0 && refNum <= refs.length) {
            return sanitizeReference(refs[refNum - 1]);
        }
        return undefined;
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
                const reference = getReferenceById(msg, refNum);

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
                                } else if (msg.metadata?.references && msg.metadata.references.length > 0) {
                                    setSelectedReference(msg.metadata.references[0]);
                                }
                                setForceUpdate(prev => prev + 1);
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
            <MarkdownContent
                content={content}
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

                                // 优先查找知识库片段（kbChunks），如果没有则查找引用（references）
                                const kbChunks = msg.metadata?.kbChunks || [];
                                const kbChunk = kbChunks[refId - 1]; // 引用编号从1开始，数组索引从0开始
                                const reference = getReferenceById(msg, refId);

                                // 添加引用链接
                                parts.push(
                                    <span key={`ref-${refId}-${currentMatch.index}`} className="inline-flex items-center whitespace-nowrap">
                                        <a
                                            href="#"
                                            className="inline-flex items-center text-blue-500 hover:text-blue-700 cursor-pointer px-1 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 mx-0.5"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();

                                // 优先显示知识库片段，如果没有则显示引用
                                if (kbChunk) {
                                    setSelectedKbChunk(kbChunk);
                                } else if (reference) {
                                    setSelectedReference(reference);
                                } else if (kbChunks.length > 0) {
                                    // 如果引用编号超出范围，显示第一个片段
                                    setSelectedKbChunk(kbChunks[0]);
                                } else if (msg.metadata?.references && msg.metadata.references.length > 0) {
                                    setSelectedReference(msg.metadata.references[0]);
                                }
                                setForceUpdate(prev => prev + 1);
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
            />
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

    const thinkingMarkdownComponents = {
        p: ({ children, ...props }: any) => (
            <p
                {...props}
                className="font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-sky-800 dark:text-sky-200"
            >
                {children}
            </p>
        ),
        ul: ({ children, ...props }: any) => (
            <ul
                {...props}
                className="font-mono list-disc pl-5 text-[13px] leading-relaxed text-sky-800 dark:text-sky-200 space-y-1"
            >
                {children}
            </ul>
        ),
        ol: ({ children, ...props }: any) => (
            <ol
                {...props}
                className="font-mono list-decimal pl-5 text-[13px] leading-relaxed text-sky-800 dark:text-sky-200 space-y-1"
            >
                {children}
            </ol>
        ),
        code: ({ children, ...props }: any) => (
            <code
                {...props}
                className="font-mono text-[12px] px-1 py-0.5 rounded bg-sky-100/80 dark:bg-sky-900/40 text-sky-900 dark:text-sky-200"
            >
                {children}
            </code>
        ),
        li: ({ children, ...props }: any) => (
            <li
                {...props}
                className="font-mono text-[13px] leading-relaxed text-sky-800 dark:text-sky-200"
            >
                {children}
            </li>
        )
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
                isStreaming && !isUser && isThinkingModeRender ? "border-cyan-500 border-2" : ""
            )}>
                {isThinkingModeRender ? (
                    <div className="flex flex-col gap-3">
                        {!displayReasoningContent && !displayFinalContent && isStreaming && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <div className="flex space-x-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                    <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                </div>
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
                                            onClick={handleToggleReasoning}
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
                                    <div className="rounded-md border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 px-3 py-2 space-y-2">
                                        <MarkdownContent 
                                            content={displayReasoningContent}
                                            components={thinkingMarkdownComponents}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 显示最终答案：如果有内容，或者正在流式传输且有思考内容（说明可能正在生成最终答案） */}
                        {(displayFinalContent || (isStreaming && displayReasoningContent)) && (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                                    <h3 className="text-sm font-medium text-muted-foreground">{t('finalAnswer')}</h3>
                                </div>
                                {displayFinalContent ? (
                                    <MarkdownContent
                                        content={typeof displayFinalContent === 'string' ? displayFinalContent : ''}
                                        className={cn(isStreaming && "animate-blinking-cursor")}
                                    />
                                ) : (
                                    // 如果内容为空但正在流式传输且有思考内容，显示加载动画
                                    isStreaming && displayReasoningContent && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <div className="flex space-x-1.5">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                                                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                                <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                            </div>
                                            <span>{t('thinkingNow')}</span>
                                        </div>
                                    )
                                )}
                                {isStreaming && displayFinalContent && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <div className="flex space-x-1.5">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                        </div>
                                        <span>{t('thinkingNow')}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 知识库片段信息 - 在思考模式下也显示在尾部 */}
                        {((currentKbChunks && isUsingKb) || (message.metadata?.kbChunks && Array.isArray(message.metadata.kbChunks) && message.metadata.kbChunks.length > 0)) && !isUser && (
                            <div className="mt-3">
                                {(() => {
                                    const kbChunksToShow = currentKbChunks || message.metadata?.kbChunks || [];
                                    const kbName = message.metadata?.kbName || '';
                                    
                                    // 调试信息（开发环境）
                                    if (process.env.NODE_ENV === 'development') {
                                        console.log('[ChatMessageItem] KB Chunks Debug:', {
                                            hasCurrentKbChunks: !!currentKbChunks,
                                            currentKbChunksLength: currentKbChunks?.length || 0,
                                            hasMetadataKbChunks: !!message.metadata?.kbChunks,
                                            metadataKbChunksLength: message.metadata?.kbChunks?.length || 0,
                                            isUsingKb,
                                            kbChunksToShowLength: kbChunksToShow.length,
                                            kbName
                                        });
                                    }
                                    
                                    // 只有在流式传输结束后（!isStreaming）或者明确有 metadata.kbChunks 时才判断是否显示"未找到"
                                    const shouldShowNoChunks = kbChunksToShow.length === 0 && 
                                        !isStreaming && 
                                        (message.metadata?.kbChunks !== undefined) &&
                                        kbName;
                                    
                                    if (shouldShowNoChunks) {
                                        return (
                                            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-amber-600 dark:text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span className="text-amber-800 dark:text-amber-300">
                                                        {t('noChunks')} - {t('source')}：{kbName}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    
                                    if (kbChunksToShow.length > 0) {
                                        return (
                                            <div className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 rounded-md p-3">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <span className="font-medium text-blue-800 dark:text-blue-300">
                                                        {t('source')}：{kbName}（找到 {kbChunksToShow.length} 个相关片段）
                                                    </span>
                                                </div>
                                                <div className="space-y-2">
                                                    {kbChunksToShow
                                                        .slice()
                                                        .sort((a, b) => getSortKey(a) - getSortKey(b))
                                                        .slice(0, 3)
                                                        .map((chunk, i) => {
                                                            const expanded = expandedIndexes.includes(i);
                                                            const chunkContent = chunk.content_with_weight || chunk.content || '';
                                                            return (
                                                                <div
                                                                    key={i}
                                                                    className="p-2 bg-white dark:bg-gray-800 rounded border border-blue-100 dark:border-blue-900/50"
                                                                >
                                                                    <div className="font-medium text-xs mb-1 text-gray-700 dark:text-gray-200 flex items-center justify-between">
                                                                        <span className="truncate flex-1">
                                                                            {chunk.doc_name ? decodeURIComponent(chunk.doc_name.split("?X-Amz-Algorithm")[0]) : (chunk.docName ? decodeURIComponent(chunk.docName.split("?X-Amz-Algorithm")[0]) : '')}
                                                                        </span>
                                                                        <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs whitespace-nowrap">
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
                                                                    {/* 内容预览区域 - 默认折叠显示两行 */}
                                                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                                                                        <div className={expanded ? '' : 'line-clamp-2'}>
                                                                            <MarkdownContent
                                                                                content={chunkContent}
                                                                                className="text-xs"
                                                                            />
                                                                        </div>
                                                                        <div className="flex gap-2 mt-2">
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    toggleExpand(i);
                                                                                }}
                                                                                className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                                                                            >
                                                                                {expanded ? t('collapse', '收起') : t('expand', '展开')}
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setSelectedKbChunk(chunk);
                                                                                }}
                                                                                className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                                                                            >
                                                                                {t('viewDetails', '查看详情')}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    {kbChunksToShow.length > 3 && (
                                                        <div className="text-xs text-blue-600 dark:text-blue-400 text-center">
                                                            还有 {kbChunksToShow.length - 3} 个相关片段...
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        {/* 知识库片段信息 - 在AI回答之前显示 */}
                        {((currentKbChunks && isUsingKb) || (message.metadata?.kbChunks && Array.isArray(message.metadata.kbChunks) && message.metadata.kbChunks.length > 0)) && !isUser && (
                            <div className="mb-3">
                                {(() => {
                                    const kbChunksToShow = currentKbChunks || message.metadata?.kbChunks || [];
                                    const kbName = message.metadata?.kbName || '';
                                    
                                    // 调试信息（开发环境）
                                    if (process.env.NODE_ENV === 'development') {
                                        console.log('[ChatMessageItem] KB Chunks Debug (non-thinking):', {
                                            hasCurrentKbChunks: !!currentKbChunks,
                                            currentKbChunksLength: currentKbChunks?.length || 0,
                                            hasMetadataKbChunks: !!message.metadata?.kbChunks,
                                            metadataKbChunksLength: message.metadata?.kbChunks?.length || 0,
                                            isUsingKb,
                                            kbChunksToShowLength: kbChunksToShow.length,
                                            kbName
                                        });
                                    }
                                    
                                    // 只有在流式传输结束后（!isStreaming）或者明确有 metadata.kbChunks 时才判断是否显示"未找到"
                                    const shouldShowNoChunks = kbChunksToShow.length === 0 && 
                                        !isStreaming && 
                                        (message.metadata?.kbChunks !== undefined) &&
                                        kbName;
                                    
                                    if (shouldShowNoChunks) {
                                        return (
                                            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-amber-600 dark:text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span className="text-amber-800 dark:text-amber-300">
                                                        {t('noChunks')} - {t('source')}：{kbName}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    
                                    if (kbChunksToShow.length > 0) {
                                        return (
                                            <div className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 rounded-md p-3">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <span className="font-medium text-blue-800 dark:text-blue-300">
                                                        {t('source')}：{kbName}（找到 {kbChunksToShow.length} 个相关片段）
                                                    </span>
                                                </div>
                                                <div className="space-y-2">
                                                    {kbChunksToShow
                                                        .slice()
                                                        .sort((a, b) => getSortKey(a) - getSortKey(b))
                                                        .slice(0, 3)
                                                        .map((chunk, i) => {
                                                            const expanded = expandedIndexes.includes(i);
                                                            const chunkContent = chunk.content_with_weight || chunk.content || '';
                                                            return (
                                                                <div
                                                                    key={i}
                                                                    className="p-2 bg-white dark:bg-gray-800 rounded border border-blue-100 dark:border-blue-900/50"
                                                                >
                                                                    <div className="font-medium text-xs mb-1 text-gray-700 dark:text-gray-200 flex items-center justify-between">
                                                                        <span className="truncate flex-1">
                                                                            {chunk.doc_name ? decodeURIComponent(chunk.doc_name.split("?X-Amz-Algorithm")[0]) : (chunk.docName ? decodeURIComponent(chunk.docName.split("?X-Amz-Algorithm")[0]) : '')}
                                                                        </span>
                                                                        <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs whitespace-nowrap">
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
                                                                    {/* 内容预览区域 - 默认折叠显示两行 */}
                                                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                                                                        <div className={expanded ? '' : 'line-clamp-2'}>
                                                                            <MarkdownContent
                                                                                content={chunkContent}
                                                                                className="text-xs"
                                                                            />
                                                                        </div>
                                                                        <div className="flex gap-2 mt-2">
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    toggleExpand(i);
                                                                                }}
                                                                                className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                                                                            >
                                                                                {expanded ? t('collapse', '收起') : t('expand', '展开')}
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setSelectedKbChunk(chunk);
                                                                                }}
                                                                                className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                                                                            >
                                                                                {t('viewDetails', '查看详情')}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    {kbChunksToShow.length > 3 && (
                                                        <div className="text-xs text-blue-600 dark:text-blue-400 text-center">
                                                            还有 {kbChunksToShow.length - 3} 个相关片段...
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                        )}
                        
                        {/* AI 正在回答但内容为空时，显示动画特效（类似 OpenAI/Grok） */}
                        {isStreaming && !isUser && (!displayFinalContent || displayFinalContent.trim() === '') && message.role !== 'reason' && (
                            <div className="flex items-center py-1">
                                <div className="flex space-x-1.5">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                    <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                </div>
                            </div>
                        )}

                        {message.role === 'reason' && (
                            <div className="flex items-center gap-1.5">
                                <Sparkles className="h-4 w-4 text-cyan-500 dark:text-cyan-400 shrink-0" />
                                <MarkdownContent
                                    content={typeof displayFinalContent === 'string' ? displayFinalContent : ''}
                                    className={cn(isStreaming && !isUser && "animate-blinking-cursor")}
                                />
                            </div>
                        )}

                        {message.role !== 'reason' && displayFinalContent && displayFinalContent.trim() !== '' && (
                            <>
                                {message.metadata?.references ?
                                    renderMessage(message)
                                    : (
                                        <MarkdownContent
                                            content={typeof displayFinalContent === 'string' ? displayFinalContent : ''}
                                            className={cn(isStreaming && !isUser && "animate-blinking-cursor")}
                                        />
                                    )}
                            </>
                        )}
                        
                        {/* 参考文档列表 - 显示所有引用 */}
                        {!isUser && message.metadata?.references && message.metadata.references.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2 mb-3">
                                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        {t('references', '参考文档')} ({message.metadata.references.length})
                                    </h4>
                                </div>
                                <div className="space-y-2">
                                    {message.metadata.references.map((ref: Reference, index: number) => {
                                        const sanitized = sanitizeReference(ref);
                                        const referenceId = sanitized.reference_id || index + 1;
                                        const docName = sanitized.doc_name || t('unknownDocument', '未知文档');
                                        const previewContent = sanitized.content || t('noContent', '暂无内容');
                                        return (
                                            <div 
                                                key={`${referenceId}-${index}`}
                                                className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors cursor-pointer"
                                                onClick={() => {
                                                    setSelectedReference(sanitized);
                                                    setForceUpdate(prev => prev + 1);
                                                }}
                                            >
                                                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                                                    {referenceId}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                        {docName}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                                                        {previewContent}
                                                    </div>
                                                </div>
                                                <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        );
                                    })}
                                </div>
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

            {/* 知识库片段详情弹窗 */}
            {selectedKbChunk && ReactDOM.createPortal(
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                    onClick={() => setSelectedKbChunk(null)}
                >
                    <div
                        className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                                {t('chunkDetails', '片段详情')}
                            </h3>
                            <button
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                onClick={() => setSelectedKbChunk(null)}
                                aria-label={t('close')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div className="mb-2 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                            <div>
                                <strong>{t('sourceLabel')}:</strong> {selectedKbChunk.doc_name ? decodeURIComponent(selectedKbChunk.doc_name.split("?X-Amz-Algorithm")[0]) : (selectedKbChunk.docName ? decodeURIComponent(selectedKbChunk.docName.split("?X-Amz-Algorithm")[0]) : t('unknownDocument', '未知文档'))}
                            </div>
                            <div>
                                <strong>{t('similarity')}:</strong> {selectedKbChunk.similarity ? (selectedKbChunk.similarity * 100).toFixed(1) : '0.0'}%
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md overflow-wrap-anywhere">
                            <MarkdownContent
                                content={selectedKbChunk.content_with_weight || selectedKbChunk.content || t('noContent')}
                            />
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2 mt-4 border-t">
                            {(selectedKbChunk.doc_id || selectedKbChunk.docId) && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                        const docId = selectedKbChunk.doc_id || selectedKbChunk.docId;
                                        try {
                                            const response = await fetch(`/api/document/${docId}`);
                                            const docInfo = await response.json();
                                            if (docInfo.file_url) {
                                                window.open(docInfo.file_url, '_blank');
                                            } else {
                                                alert(t('noFileUrl', '文档原文不可用'));
                                            }
                                        } catch (error) {
                                            console.error('Failed to fetch document info:', error);
                                            alert(t('loadDocumentError', '加载文档信息失败'));
                                        }
                                    }}
                                    className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300"
                                >
                                    {t('openOriginal', '打开原文')}
                                </Button>
                            )}
                            {(selectedKbChunk.chunk_id || selectedKbChunk.chunkId) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                >
                                    <Link href={`/chunks/${selectedKbChunk.chunk_id || selectedKbChunk.chunkId}`} target="_blank">
                                        {t('viewChunkDetail', '查看分块详情')}
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
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
                        <div className="space-y-3">
                            <div className="grid gap-2 text-sm text-gray-600 dark:text-gray-300">
                                <div>
                                    <strong className="mr-2">{t('sourceLabel')}:</strong>
                                    {selectedReference.doc_name || t('unknownDocument', '未知文档')}
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1">
                                    {selectedReference.doc_id && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            ID: {selectedReference.doc_id}
                                        </span>
                                    )}
                                    {selectedReference.chunk_id && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            Chunk: {selectedReference.chunk_id}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
                                <MarkdownContent
                                    content={selectedReference.content || t('noContent')}
                                />
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2">
                                {isReferenceDocLoading && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {t('loadingDocument', '正在加载文档信息...')}
                                    </span>
                                )}
                                {referenceDocError && (
                                    <span className="text-xs text-red-500">
                                        {referenceDocError}
                                    </span>
                                )}
                                {!isReferenceDocLoading && !referenceDocError && (
                                    <>
                                        {referenceDocInfo.fileUrl && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                                className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300"
                                            >
                                                <a href={referenceDocInfo.fileUrl} target="_blank" rel="noopener noreferrer">
                                                    {t('openOriginal', '打开原文')}
                                                </a>
                                            </Button>
                                        )}
                                        {selectedReference.chunk_id && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                asChild
                                            >
                                                <Link href={`/chunks/${selectedReference.chunk_id}`} target="_blank">
                                                    {t('viewChunkDetail', '查看分块详情')}
                                                </Link>
                                            </Button>
                                        )}
                                        {referenceDocInfo.markdownUrl && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                asChild
                                            >
                                                <a href={referenceDocInfo.markdownUrl} target="_blank" rel="noopener noreferrer">
                                                    {t('viewMarkdown', '查看 Markdown')}
                                                </a>
                                            </Button>
                                        )}
                                    </>
                                )}
                            </div>
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
    return <MarkdownContent
        content={replaced}
        components={{
            a: ({ ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />
        }}
    />;
}

export default ChatMessageItem;