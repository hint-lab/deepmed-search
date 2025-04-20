"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
    Card,
    CardContent,
} from "@/components/ui/card"

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
    const [researchResult, setResearchResult] = useState<any>(null);
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
                    console.log("ThinkStatusDisplay: Received result data:", data.result);
                    // 如果有结果数据，可以在这里处理
                } else {
                    console.log("ThinkStatusDisplay: Received unknown data type:", data);
                }
            } catch (e) {
                console.error(`ThinkStatusDisplay: Failed to parse think data for taskId ${taskId}:`, e, "Data:", event.data);
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

        // 处理 result 事件
        eventSource.addEventListener('result', (event) => {
            try {
                const result = JSON.parse(event.data);
                console.log("ThinkStatusDisplay: Received result event:", result);
                setResearchResult(result);
                // 如果有结果数据，可以在这里处理
            } catch (e) {
                console.error("Failed to parse result data:", e);
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
                <div className="flex items-start space-x-2">
                    <span className="text-xl mt-1">🤔</span>
                    <CardContent className="flex-1 bg-muted p-4 rounded-lg text-sm text-muted-foreground">
                        准备开始研究...
                    </CardContent>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex items-start space-x-2">
                    <span className="text-xl mt-1">⚠️</span>
                    <CardContent className="flex-1 bg-destructive/10 border border-destructive/30 p-4 rounded-lg text-sm text-destructive">
                        {error}
                    </CardContent>
                </div>
            );
        }

        if (!isConnected && !error) {
            return (
                <div className="flex items-start space-x-2 animate-pulse">
                    <span className="text-xl mt-1">📡</span>
                    <CardContent className="flex-1 bg-muted p-4 rounded-lg text-sm text-muted-foreground">
                        正在连接思考过程流...
                    </CardContent>
                </div>
            );
        }

        return (
            <div className="flex flex-col w-full max-h-[80vh] gap-2 mx-auto overflow-y-auto">
                {/* 显示研究结果 */}
                {researchResult && (
                    <div className="flex items-start space-x-2 p-4 border-b bg-green-50">
                        <span className="text-xl mt-1">📊</span>
                        <CardContent className="flex-1 bg-white p-4 rounded-lg text-sm border border-green-200">
                            <div className="font-medium mb-2 text-green-700">研究结果:</div>
                            <div className="whitespace-pre-wrap break-words">
                                {typeof researchResult === 'string'
                                    ? researchResult
                                    : JSON.stringify(researchResult, null, 2)}
                            </div>
                        </CardContent>
                    </div>
                )}

                {/* 显示 Token 使用情况 */}
                {tokenState && (
                    <div className="flex items-start space-x-2 p-4 border-b">
                        <span className="text-xl mt-1">📊</span>
                        <CardContent className="flex-1 bg-muted/50 p-4 rounded-lg text-sm">
                            <div className="font-medium mb-2">Token 使用情况:</div>
                            <div className="space-y-1">
                                <div>总使用量: {tokenState.usages.reduce((sum, u) => sum + u.usage.totalTokens, 0)} tokens</div>
                                {tokenState.budget && (
                                    <div>预算: {tokenState.budget} tokens</div>
                                )}
                            </div>
                        </CardContent>
                    </div>
                )}

                {/* 显示当前动作状态 */}
                {actionState && (
                    <div className="flex items-start space-x-2 p-4 border-b">
                        <span className="text-xl mt-1">🎯</span>
                        <CardContent className="flex-1 bg-muted/50 p-4 rounded-lg text-sm">
                            <div className="font-medium mb-2">当前状态:</div>
                            <div className="space-y-1">
                                <div>步骤: {actionState.totalStep}</div>
                                <div>动作: {actionState.thisStep.action}</div>
                                {actionState.thisStep.think && (
                                    <div>思考: {actionState.thisStep.think}</div>
                                )}
                            </div>
                        </CardContent>
                    </div>
                )}

                {/* 显示思考步骤 */}
                {thoughts.map((step, index) => (
                    <div key={index} className="flex items-start space-x-2 mb-1 px-2 animate-in fade-in slide-in-from-bottom-5 duration-300">
                        <span className="text-xl mt-1">🤔</span>
                        <CardContent className="flex-1 bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap break-words">
                            {step.think}
                        </CardContent>
                    </div>
                ))}

                {/* 显示等待状态 */}
                {isConnected && thoughts.length === 0 && (
                    <div className="flex items-start space-x-2">
                        <span className="text-xl mt-1">⏳</span>
                        <CardContent className="flex-1 bg-muted p-4 rounded-lg text-sm text-muted-foreground">
                            已连接，等待第一个思考步骤...
                        </CardContent>
                    </div>
                )}
            </div>
        );
    }

    return (
        <Card className="w-full max-w-2xl mx-auto mt-1 border border-border/60 shadow-sm">
            {renderContent()}
        </Card>
    );
}