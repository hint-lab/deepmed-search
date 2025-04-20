"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
    Card,
    CardContent,
} from "@/components/ui/card"
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ThinkStep {
    think: string;
}

interface TokenState {
    usages: Array<{
        tool: string;
        usage: {
            promptTokens: number;
            completionTokens: number;
            totalTokens: number;
        };
    }>;
    budget?: number;
}

interface ActionState {
    thisStep: {
        action: string;
        answer?: string;
        references?: string[];
        think?: string;
    };
    gaps: string[];
    totalStep: number;
}

interface Reference {
    exactQuote?: string;
    url: string;
    title?: string;
    dateTime?: string;
    relevanceScore?: number;
    answerChunk?: string;
    answerChunkPosition?: [number, number];
}

interface ResearchResult {
    action: string;
    answer?: string;
    references?: Reference[];
    think?: string;
    isFinal?: boolean;
    mdAnswer?: string;
}

// Define props interface
interface ThinkStatusDisplayProps {
    taskId: string | null;
}

export default function ThinkStatusDisplay({ taskId }: ThinkStatusDisplayProps) {
    const [thoughts, setThoughts] = useState<ThinkStep[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tokenState, setTokenState] = useState<TokenState | null>(null);
    const [actionState, setActionState] = useState<ActionState | null>(null);
    const [researchResult, setResearchResult] = useState<ResearchResult | null>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    // 使用一个 useRef 对象来存储所有需要跨渲染周期保持的状态
    const sseStateRef = useRef<{
        eventSource: EventSource | null;
        isCreated: boolean;
        taskId: string | null;
    }>({
        eventSource: null,
        isCreated: false,
        taskId: null
    });

    useEffect(() => {
        // 如果 taskId 变化，重置状态
        if (sseStateRef.current.taskId !== taskId) {
            console.log(`ThinkStatusDisplay: TaskId changed from ${sseStateRef.current.taskId} to ${taskId}, resetting state`);
            sseStateRef.current.taskId = taskId;
            sseStateRef.current.isCreated = false;

            // 如果存在旧的连接，关闭它
            if (sseStateRef.current.eventSource) {
                console.log(`ThinkStatusDisplay: Closing old SSE connection for taskId: ${sseStateRef.current.taskId}`);
                sseStateRef.current.eventSource.close();
                sseStateRef.current.eventSource = null;
            }

            // 重置状态
            setThoughts([]);
            setIsConnected(false);
            setError(null);
            setTokenState(null);
            setActionState(null);
        }

        if (!taskId) {
            console.log("ThinkStatusDisplay: No taskId provided, waiting...");
            return;
        }

        // 检查是否已经创建了 SSE 连接
        if (sseStateRef.current.isCreated && sseStateRef.current.eventSource) {
            console.log("ThinkStatusDisplay: SSE connection already created and active, skipping...");
            return;
        }

        console.log(`ThinkStatusDisplay: Attempting to connect with taskId: ${taskId}`);
        const eventSource = new EventSource(`/api/research/stream?taskId=${taskId}`);
        sseStateRef.current.eventSource = eventSource;
        sseStateRef.current.isCreated = true;

        // 添加连接超时处理
        const connectionTimeout = setTimeout(() => {
            if (!isConnected) {
                console.error(`ThinkStatusDisplay: Connection timeout for taskId: ${taskId}`);
                setError(`连接超时，请刷新页面重试。`);
                setIsConnected(false);
                if (sseStateRef.current.eventSource) {
                    sseStateRef.current.eventSource.close();
                    sseStateRef.current.eventSource = null;
                }
            }
        }, 30000); // 30 秒超时

        eventSource.onopen = () => {
            console.log(`ThinkStatusDisplay: SSE connection opened successfully for taskId: ${taskId}`);
            setIsConnected(true);
            setError(null);
            clearTimeout(connectionTimeout);
        };

        eventSource.onmessage = (event) => {
            console.log(`ThinkStatusDisplay: Received message for taskId: ${taskId}`, event.data);
            try {
                const data = JSON.parse(event.data);

                if (data.think) {
                    console.log(`ThinkStatusDisplay: Received think event:`, data.think);
                    setError(null);
                    setThoughts(prev => [...prev, { think: data.think }]);
                    setTimeout(() => {
                        const scrollViewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
                        if (scrollViewport) {
                            scrollViewport.scrollTop = scrollViewport.scrollHeight;
                        }
                    }, 0);
                } else if (data.error) {
                    console.error("ThinkStatusDisplay: Received error message from server:", data.error);
                    setError(`研究任务报告错误: ${data.error}`);
                    setIsConnected(false);
                } else if (data.complete) {
                    console.log("ThinkStatusDisplay: Received completion message from server:", data.complete);
                    setIsConnected(false);
                } else if (data.result) {
                    console.log("ThinkStatusDisplay: Received result data via onmessage:", data.result);
                    if (typeof data.result === 'object' && data.result !== null && data.result.action) {
                        setResearchResult(data.result);
                    } else {
                        console.warn("ThinkStatusDisplay: Received unexpected data structure in onmessage 'result':", data.result);
                    }
                } else {
                    console.log("ThinkStatusDisplay: Received unknown data type:", data);
                }
            } catch (e) {
                console.error(`ThinkStatusDisplay: Failed to parse message data for taskId ${taskId}:`, e, "Data:", event.data);
            }
        };

        // 处理 tokenState 事件
        eventSource.addEventListener('tokenState', (event) => {
            try {
                const state = JSON.parse(event.data);
                console.log("ThinkStatusDisplay: Received tokenState event:", state);
                setTokenState(state);
            } catch (e) {
                console.error("Failed to parse token state:", e);
            }
        });

        // 处理 actionState 事件
        eventSource.addEventListener('actionState', (event) => {
            try {
                const state = JSON.parse(event.data);
                console.log("ThinkStatusDisplay: Received actionState event:", state);
                setActionState(state);
            } catch (e) {
                console.error("Failed to parse action state:", e);
            }
        });

        eventSource.addEventListener('result', (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log("ThinkStatusDisplay: Received result event data:", data);
                if (data && data.result && typeof data.result === 'object') {
                    setResearchResult(data.result);
                } else {
                    console.warn("ThinkStatusDisplay: Received result event data in unexpected format:", data);
                    if (typeof data === 'object' && data !== null && data.action) {
                        setResearchResult(data);
                    }
                }
                console.log("ThinkStatusDisplay: Received result event data:", data);
            } catch (e) {
                console.error("Failed to parse result event data:", e);
            }
        });

        eventSource.onerror = (err) => {
            console.error(`ThinkStatusDisplay: SSE connection error for taskId ${taskId}:`, err);
            if (sseStateRef.current.eventSource && sseStateRef.current.eventSource.readyState !== EventSource.CLOSED) {
                setError(`无法连接到思考过程流 (ID: ${taskId}). 请稍后重试或检查网络连接。`);
                setIsConnected(false);
            } else {
                console.log(`ThinkStatusDisplay: SSE connection closed for taskId: ${taskId}.`);
                setIsConnected(false);
            }
            clearTimeout(connectionTimeout);
        };

        return () => {
            clearTimeout(connectionTimeout);
            // 只有在组件卸载或 taskId 变化时才关闭连接
            if (sseStateRef.current.eventSource && sseStateRef.current.taskId === taskId) {
                console.log(`ThinkStatusDisplay: Cleaning up SSE connection for taskId: ${taskId}`);
                sseStateRef.current.eventSource.close();
                sseStateRef.current.eventSource = null;
            }
        };
    }, [taskId, isConnected]);

    const renderContent = () => {
        if (!taskId) {
            return (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <span className="text-lg">准备开始研究...</span>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex items-center justify-center h-32 text-destructive">
                    <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/30">
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            );
        }

        if (!isConnected && !error) {
            return (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span className="text-lg">正在连接思考过程流...</span>
                </div>
            );
        }

        return (
            <div className="space-y-6 p-4">
                {researchResult && (
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-border/60 shadow-lg">
                        <div className="prose dark:prose-invert max-w-none">
                            {typeof researchResult === 'string' ? (
                                <div className="space-y-4">
                                    {(researchResult as string).split('\n\n').map((paragraph: string, index: number) => (
                                        <p key={index} className="text-base leading-relaxed">
                                            {paragraph}
                                        </p>
                                    ))}
                                </div>
                            ) : researchResult.mdAnswer ? (
                                <div className="space-y-4">
                                    {researchResult.mdAnswer.split('\n\n').map((paragraph: string, index: number) => {
                                        const processedParagraph = paragraph.replace(/\[\^(\d+)\]/g, (match: string, num: string) => {
                                            return `<sup class="text-primary cursor-pointer hover:text-primary/80">[${num}]</sup>`;
                                        });
                                        return (
                                            <div key={index} className="text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: processedParagraph }} />
                                        );
                                    })}
                                </div>
                            ) : researchResult.answer ? (
                                <div className="space-y-4">
                                    {researchResult.answer.split('\n\n').map((paragraph: string, index: number) => (
                                        <p key={index} className="text-base leading-relaxed">
                                            {paragraph}
                                        </p>
                                    ))}
                                </div>
                            ) : (
                                <pre className="text-sm bg-muted/40 p-4 rounded-lg overflow-x-auto">
                                    {JSON.stringify(researchResult, null, 2)}
                                </pre>
                            )}
                        </div>

                        {researchResult.references && researchResult.references.length > 0 && (
                            <div className="mt-8 pt-6 border-t border-border/60">
                                <h3 className="text-lg font-semibold mb-4 text-muted-foreground">参考文献</h3>
                                <div className="space-y-3">
                                    {researchResult.references.map((ref: Reference, index: number) => (
                                        <div key={index} className="group relative pl-4 py-2">
                                            <div className="absolute left-0 top-0 h-full w-0.5 bg-gradient-to-b from-primary/50 to-primary/20 group-hover:from-primary group-hover:to-primary/50 transition-colors duration-300" />
                                            <div className="space-y-1">
                                                <div className="flex items-start gap-2">
                                                    <span className="text-sm font-medium text-primary">[{index + 1}]</span>
                                                    <div className="flex-1">
                                                        <a
                                                            href={ref.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                                        >
                                                            {ref.title || ref.url}
                                                        </a>
                                                        {ref.dateTime && (
                                                            <span className="block text-xs text-muted-foreground mt-1">
                                                                {ref.dateTime}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {ref.exactQuote && (
                                                    <div className="mt-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                                                        <p className="italic">{ref.exactQuote}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {tokenState && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                        <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300 mb-4">Token 使用情况</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-blue-600 dark:text-blue-400">总使用量</span>
                                <span className="font-mono text-sm">
                                    {tokenState.usages.reduce((sum, u) => sum + u.usage.totalTokens, 0)} tokens
                                </span>
                            </div>
                            {tokenState.budget && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-blue-600 dark:text-blue-400">预算</span>
                                    <span className="font-mono text-sm">{tokenState.budget} tokens</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {actionState && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
                        <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-4">当前状态</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-purple-600 dark:text-purple-400">步骤</span>
                                <span className="font-mono text-sm">{actionState.totalStep}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-purple-600 dark:text-purple-400">动作</span>
                                <span className="font-mono text-sm">{actionState.thisStep.action}</span>
                            </div>
                            {actionState.thisStep.think && (
                                <div className="mt-2">
                                    <span className="text-sm text-purple-600 dark:text-purple-400">思考</span>
                                    <p className="text-sm mt-1">{actionState.thisStep.think}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {thoughts.map((step, index) => (
                        <div
                            key={index}
                            className={cn(
                                "group relative pl-4 py-2 transition-all duration-300",
                                "before:absolute before:left-0 before:top-0 before:h-full before:w-0.5",
                                "before:bg-gradient-to-b before:from-blue-500 before:to-purple-500",
                                "hover:before:opacity-100 before:opacity-50"
                            )}
                        >
                            <div className="prose dark:prose-invert max-w-none">
                                <p className="text-sm leading-relaxed">{step.think}</p>
                            </div>
                        </div>
                    ))}

                    {isConnected && thoughts.length === 0 && (
                        <div className="flex items-center justify-center h-32 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" />
                            <span className="text-lg">等待第一个思考步骤...</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <Card className="w-full max-w-4xl mx-auto bg-background/50 backdrop-blur-sm border-border/60 shadow-lg">
            <CardContent className="p-0">
                {renderContent()}
            </CardContent>
        </Card>
    );
}