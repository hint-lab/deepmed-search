"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
    Card,
    CardContent,
} from "@/components/ui/card"
import { cn } from "@/lib/utils";
import { 
    Loader2, 
    BarChart3, 
    CheckCircle2, 
    Square, 
    Search, 
    Globe, 
    BookOpen, 
    Zap, 
    MessageCircle, 
    HelpCircle, 
    Lightbulb, 
    Library, 
    AlertTriangle 
} from "lucide-react";
import { useTranslate } from '@/contexts/language-context';

interface ThinkStep {
    think: string;
    stepNumber?: number; // 步骤编号（从 "步骤 X:" 中提取）
    details?: string[];
}

interface QuestionEvaluation {
    think: string;
    needsDefinitive: boolean;
    needsFreshness: boolean;
    needsPlurality: boolean;
    needsCompleteness: boolean;
}

interface SearchQuery {
    q: string;
    tbs?: string;
    gl?: string;
    hl?: string;
}

interface ReadContent {
    title: string;
    url: string;
    tokens: number;
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
    const { t } = useTranslate('research');
    const [thoughts, setThoughts] = useState<ThinkStep[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tokenState, setTokenState] = useState<TokenState | null>(null);
    const [actionState, setActionState] = useState<ActionState | null>(null);
    const [researchResult, setResearchResult] = useState<ResearchResult | null>(null);
    const [questionEvaluation, setQuestionEvaluation] = useState<QuestionEvaluation | null>(null);
    const [searchQueries, setSearchQueries] = useState<SearchQuery[]>([]);
    const [visitedUrls, setVisitedUrls] = useState<string[]>([]);
    const [readContents, setReadContents] = useState<ReadContent[]>([]);
    const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    // 使用一个 useRef 对象来存储所有需要跨渲染周期保持的状态
    const sseStateRef = useRef<{
        eventSource: EventSource | null;
        isCreated: boolean;
        taskId: string | null;
        retryMs: number;
    }>({
        eventSource: null,
        isCreated: false,
        taskId: null,
        retryMs: 1000
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
            setQuestionEvaluation(null);
            setSearchQueries([]);
            setVisitedUrls([]);
            setReadContents([]);
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
                setError(t('connectionTimeout'));
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

                // 处理新的事件格式：{type: "eventName", payload: "..."}
                if (data.type && data.payload) {
                    console.log(`ThinkStatusDisplay: Received ${data.type} event with payload`);
                    
                    switch (data.type) {
                        case 'questionEvaluation':
                            try {
                                const evalData = typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload;
                                console.log("ThinkStatusDisplay: Question evaluation:", evalData);
                                setQuestionEvaluation(evalData);
                            } catch (e) {
                                console.error("Failed to parse question evaluation:", e);
                            }
                            break;
                            
                        case 'searchQuery':
                            try {
                                const queryData = typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload;
                                console.log("ThinkStatusDisplay: Search query:", queryData);
                                setSearchQueries(prev => [...prev, queryData]);
                            } catch (e) {
                                console.error("Failed to parse search query:", e);
                            }
                            break;
                            
                        case 'visitUrl':
                            try {
                                const urls = typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload;
                                console.log("ThinkStatusDisplay: Visit URLs:", urls);
                                setVisitedUrls(prev => [...prev, ...(Array.isArray(urls) ? urls : [urls])]);
                            } catch (e) {
                                console.error("Failed to parse visit URLs:", e);
                            }
                            break;
                            
                        case 'readContent':
                            try {
                                const content = typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload;
                                console.log("ThinkStatusDisplay: Read content:", content);
                                setReadContents(prev => [...prev, content]);
                            } catch (e) {
                                console.error("Failed to parse read content:", e);
                            }
                            break;
                    }
                }
                // 保留原有的处理逻辑
                else if (data.think) {
                    console.log(`ThinkStatusDisplay: Received think event:`, data.think);
                    setError(null);
                    
                    // 提取步骤编号（如果有）
                    const stepMatch = data.think.match(/^步骤\s*(\d+):/);
                    const currentStepNumber = stepMatch ? parseInt(stepMatch[1]) : null;
                    
                    // 判断是否为辅助信息（应该作为详情显示）
                    const isDetailMessage = 
                        data.think.startsWith('步骤') ||  // "步骤 X:"开头的消息
                        data.think.startsWith('💭') ||    // 详细思考过程
                        (data.think.startsWith('📝') && !data.think.includes('LLM')) ||    // 回顾分析
                        data.think.startsWith('⚠️') ||    // 所有警告消息（包括LLM错误）
                        data.think.startsWith('💡') ||    // 改进建议
                        data.think.includes('主问题答案评估') ||
                        data.think.includes('开始反思') ||
                        data.think.includes('开始搜索') ||
                        data.think.includes('开始回答') ||
                        data.think.includes('正在思考问题') ||
                        data.think.includes('研究完成') ||
                        data.think.includes('深度思考结束') ||
                        data.think.includes('LLM 未能生成');
                    
                    if (isDetailMessage) {
                        // 作为详情添加
                        setThoughts(prev => {
                            if (prev.length === 0) {
                                // 如果还没有步骤，创建一个临时步骤
                                return [{ think: '初始化研究...', stepNumber: currentStepNumber || undefined, details: [data.think] }];
                            }
                            
                            const newThoughts = [...prev];
                            
                            // 如果有步骤号，尝试找到对应的步骤
                            if (currentStepNumber) {
                                const existingStepIndex = newThoughts.findIndex(s => s.stepNumber === currentStepNumber);
                                
                                if (existingStepIndex >= 0) {
                                    // 找到了对应步骤，添加详情
                                    newThoughts[existingStepIndex] = {
                                        ...newThoughts[existingStepIndex],
                                        details: [...(newThoughts[existingStepIndex].details || []), data.think]
                                    };
                                    // 自动展开这个步骤
                                    setExpandedSteps(prev => new Set([...prev, existingStepIndex]));
                                } else {
                                    // 没找到对应步骤，创建新步骤
                                    newThoughts.push({ 
                                        think: `步骤 ${currentStepNumber}`, 
                                        stepNumber: currentStepNumber, 
                                        details: [data.think] 
                                    });
                                    setExpandedSteps(prev => new Set([...prev, newThoughts.length - 1]));
                                }
                            } else {
                                // 没有步骤号，添加到最后一个步骤
                                const lastIndex = newThoughts.length - 1;
                                newThoughts[lastIndex] = {
                                    ...newThoughts[lastIndex],
                                    details: [...(newThoughts[lastIndex].details || []), data.think]
                                };
                                setExpandedSteps(prev => new Set([...prev, lastIndex]));
                            }
                            
                            return newThoughts;
                        });
                    } else {
                        // 作为新步骤添加（主要的思考内容）
                        setThoughts(prev => {
                            // 如果有步骤号，检查是否已存在该步骤
                            if (currentStepNumber) {
                                const existingStepIndex = prev.findIndex(s => s.stepNumber === currentStepNumber);
                                if (existingStepIndex >= 0) {
                                    // 已存在该步骤，不创建新的，只更新 think（如果当前是更重要的消息）
                                    return prev;
                                } else {
                                    // 不存在，创建新步骤
                                    const newStep = { think: data.think, stepNumber: currentStepNumber, details: [] };
                                    setExpandedSteps(prevExpanded => new Set([...prevExpanded, prev.length]));
                                    return [...prev, newStep];
                                }
                            } else {
                                // 没有步骤号，作为独立步骤添加
                                const newStep = { think: data.think, stepNumber: undefined, details: [] };
                                setExpandedSteps(prevExpanded => new Set([...prevExpanded, prev.length]));
                                return [...prev, newStep];
                            }
                        });
                    }
                    
                    setTimeout(() => {
                        const scrollViewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
                        if (scrollViewport) {
                            scrollViewport.scrollTop = scrollViewport.scrollHeight;
                        }
                    }, 0);
                } else if (data.error) {
                    console.error("ThinkStatusDisplay: Received error message from server:", data.error);
                    setError(`${t('taskError')}: ${data.error}`);
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
            const readyState = sseStateRef.current.eventSource?.readyState;
            
            // 如果是正常关闭（CLOSED=2），不记录为错误
            if (readyState === EventSource.CLOSED) {
                console.log(`ThinkStatusDisplay: SSE connection closed normally for taskId: ${taskId}.`);
                setIsConnected(false);
                clearTimeout(connectionTimeout);
                return;
            }
            
            // 只有非正常关闭时才记录错误
            console.error(`ThinkStatusDisplay: SSE connection error for taskId ${taskId}:`, {
                error: err,
                readyState: readyState,
                readyStateText: readyState === 0 ? 'CONNECTING' : readyState === 1 ? 'OPEN' : readyState === 2 ? 'CLOSED' : 'UNKNOWN'
            });
            
            // 只在连接未正常关闭时显示错误
            if (sseStateRef.current.eventSource && readyState !== EventSource.CLOSED) {
                // 如果是连接状态（CONNECTING=0），可能是暂时性问题，等待重连
                if (readyState === 0) {
                    console.log(`ThinkStatusDisplay: Connection is still attempting for taskId: ${taskId}, waiting...`);
                } else {
                    setError(`${t('connectionError')} (ID: ${taskId})`);
                    setIsConnected(false);
                }
            }
            clearTimeout(connectionTimeout);

            // 指数退避重连
            try {
                if (sseStateRef.current.eventSource) {
                    sseStateRef.current.eventSource.close();
                    sseStateRef.current.eventSource = null;
                    sseStateRef.current.isCreated = false;
                }
                const delay = Math.min(sseStateRef.current.retryMs, 15000);
                console.log(`ThinkStatusDisplay: Will retry SSE in ${delay}ms for taskId: ${taskId}`);
                setTimeout(() => {
                    // 仅当 taskId 未变化且当前没有连接时重连
                    if (sseStateRef.current.taskId === taskId && !sseStateRef.current.eventSource) {
                        sseStateRef.current.retryMs = Math.min(delay * 2, 15000);
                        // 触发重新连接：通过重置 isCreated 并调用一次 setIsConnected(false) 促使 Effect 重新执行
                        setIsConnected(false);
                    }
                }, delay);
            } catch (reErr) {
                console.error('ThinkStatusDisplay: retry setup error', reErr);
            }
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
    }, [taskId, isConnected, t]);

    const renderContent = () => {
        if (!taskId) {
            return (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <span className="text-lg">{t('preparingResearch')}</span>
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
                <div className="w-full mb-6 p-8">
                    <div className="flex flex-col items-center space-y-6">
                        {/* 简洁的三点跳动动画 */}
                        <div className="flex space-x-3">
                            <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce"></div>
                            <div className="w-4 h-4 bg-cyan-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                            <div className="w-4 h-4 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                        </div>
                        
                        {/* 文本信息 */}
                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400">
                                {t('connecting')}
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-md">
                                {t('preparingResearch')}
                            </p>
                        </div>
                        
                        <div className="w-full max-w-xs h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-progress-bar"></div>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-6 p-4">
                 {questionEvaluation && (
                     <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-indigo-200 dark:border-indigo-800">
                         <h3 className="text-lg font-semibold text-indigo-700 dark:text-indigo-300 mb-4 flex items-center gap-2">
                             <BarChart3 className="w-5 h-5" /> {t('questionEvaluation')}
                         </h3>
                         <div className="space-y-3">
                             <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3">
                                 <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                                     <span className="font-semibold text-indigo-600 dark:text-indigo-400">{t('evaluationThink')}：</span>
                                     {questionEvaluation.think}
                                 </p>
                             </div>
                             <div className="grid grid-cols-2 gap-3">
                                 <div className={cn(
                                     "flex items-center gap-2 px-3 py-2 rounded-lg",
                                     questionEvaluation.needsDefinitive 
                                         ? "bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700"
                                         : "bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700"
                                 )}>
                                     <span className="text-xl">{questionEvaluation.needsDefinitive ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Square className="w-5 h-5 text-gray-400" />}</span>
                                     <span className={cn(
                                         "text-sm font-medium",
                                         questionEvaluation.needsDefinitive 
                                             ? "text-green-700 dark:text-green-300"
                                             : "text-gray-600 dark:text-gray-400"
                                     )}>
                                         {t('needsDefinitive')}
                                     </span>
                                 </div>
                                 <div className={cn(
                                     "flex items-center gap-2 px-3 py-2 rounded-lg",
                                     questionEvaluation.needsFreshness 
                                         ? "bg-blue-100 dark:bg-blue-900/30 border cyan-300 dark:cyan-700"
                                         : "bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700"
                                 )}>
                                     <span className="text-xl">{questionEvaluation.needsFreshness ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Square className="w-5 h-5 text-gray-400" />}</span>
                                     <span className={cn(
                                         "text-sm font-medium",
                                         questionEvaluation.needsFreshness 
                                             ? "text-blue-700 dark:text-blue-300"
                                             : "text-gray-600 dark:text-gray-400"
                                     )}>
                                         {t('needsFreshness')}
                                     </span>
                                 </div>
                                 <div className={cn(
                                     "flex items-center gap-2 px-3 py-2 rounded-lg",
                                     questionEvaluation.needsPlurality 
                                         ? "bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700"
                                         : "bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700"
                                 )}>
                                     <span className="text-xl">{questionEvaluation.needsPlurality ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Square className="w-5 h-5 text-gray-400" />}</span>
                                     <span className={cn(
                                         "text-sm font-medium",
                                         questionEvaluation.needsPlurality 
                                             ? "text-orange-700 dark:text-orange-300"
                                             : "text-gray-600 dark:text-gray-400"
                                     )}>
                                         {t('needsPlurality')}
                                     </span>
                                 </div>
                                 <div className={cn(
                                     "flex items-center gap-2 px-3 py-2 rounded-lg",
                                     questionEvaluation.needsCompleteness 
                                         ? "bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700"
                                         : "bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700"
                                 )}>
                                     <span className="text-xl">{questionEvaluation.needsCompleteness ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Square className="w-5 h-5 text-gray-400" />}</span>
                                     <span className={cn(
                                         "text-sm font-medium",
                                         questionEvaluation.needsCompleteness 
                                             ? "text-purple-700 dark:text-purple-300"
                                             : "text-gray-600 dark:text-gray-400"
                                     )}>
                                         {t('needsCompleteness')}
                                     </span>
                                 </div>
                             </div>
                         </div>
                     </div>
                 )}

                {Array.isArray(searchQueries) && searchQueries.length > 0 && (
                    <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-lg p-6 border border-teal-200 dark:border-teal-800">
                        <h3 className="text-lg font-semibold text-teal-700 dark:text-teal-300 mb-4 flex items-center gap-2">
                            <Search className="w-5 h-5" /> {t('searchQueries')} ({searchQueries.length})
                        </h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {searchQueries.map((query, index) => (
                                 <div key={index} className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 text-sm">
                                     <span className="font-semibold text-teal-600 dark:text-teal-400">#{index + 1}:</span>{' '}
                                     <span className="text-gray-700 dark:text-gray-300">{query.q}</span>
                                     {query.tbs && (
                                         <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                             ({query.tbs})
                                         </span>
                                     )}
                                     {(query.gl || query.hl) && (
                                         <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                             [{query.gl && `${t('region')}: ${query.gl}`} {query.hl && `${t('language')}: ${query.hl}`}]
                                         </span>
                                     )}
                                 </div>
                             ))}
                         </div>
                     </div>
                 )}

                {Array.isArray(visitedUrls) && visitedUrls.length > 0 && (
                    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-lg p-6 border border-amber-200 dark:border-amber-800">
                        <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-300 mb-4 flex items-center gap-2">
                            <Globe className="w-5 h-5" /> {t('visitedPages')} ({visitedUrls.length})
                        </h3>
                       <div className="space-y-2 max-h-64 overflow-y-auto">
                            {visitedUrls.map((url, index) => (
                                <div key={index} className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 text-sm">
                                    <span className="font-semibold text-amber-600 dark:text-amber-400">#{index + 1}:</span>{' '}
                                    <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                                    >
                                        {url}
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                 {Array.isArray(readContents) && readContents.length > 0 && (
                     <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
                         <h3 className="text-lg font-semibold text-green-700 dark:text-green-300 mb-4 flex items-center gap-2">
                             <BookOpen className="w-5 h-5" /> {t('readContents')} ({readContents.length})
                         </h3>
                         <div className="space-y-3 max-h-96 overflow-y-auto">
                             {readContents.map((content, index) => (
                                 <div key={index} className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-4">
                                     <div className="flex items-start gap-3">
                                         <span className="font-semibold text-green-600 dark:text-green-400 flex-shrink-0">
                                             #{index + 1}
                                         </span>
                                         <div className="flex-1 min-w-0">
                                             <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                                                 {content.title}
                                             </div>
                                             <a
                                                 href={content.url}
                                                 target="_blank"
                                                 rel="noopener noreferrer"
                                                 className="text-xs text-blue-600 dark:text-blue-400 hover:underline break-all block mb-2"
                                             >
                                                 {content.url}
                                             </a>
                                             <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                 <span className="flex items-center gap-1">
                                                     <BarChart3 className="w-3.5 h-3.5" />
                                                     <span>{content.tokens} {t('tokens')}</span>
                                                 </span>
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>
                 )}

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

                        {Array.isArray(researchResult.references) && researchResult.references.length > 0 && (
                            <div className="mt-8 pt-6 border-t border-border/60">
                                <h3 className="text-lg font-semibold mb-4 text-muted-foreground">{t('references')}</h3>
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
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border cyan-200 dark:cyan-800">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="w-6 h-6" />
                                <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300">{t('tokenUsage')}</h3>
                            </div>
                            <div className="flex items-center gap-4 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="text-blue-600 dark:text-blue-400">{t('totalUsage')}:</span>
                                    <span className="font-mono font-bold text-blue-700 dark:text-blue-300">
                                        {tokenState.usages.reduce((sum, u) => sum + u.usage.totalTokens, 0).toLocaleString()}
                                    </span>
                                </div>
                                {tokenState.budget && (
                                    <>
                                        <span className="text-blue-300 dark:text-blue-600">/</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-blue-600 dark:text-blue-400">{t('budget')}:</span>
                                            <span className="font-mono font-bold text-blue-700 dark:text-blue-300">
                                                {tokenState.budget.toLocaleString()}
                                            </span>
                                        </div>
                                    </>
                                )}
                                {tokenState.budget && (
                                    <div className="ml-2 px-2 py-1 rounded-full bg-blue-200 dark:bg-blue-800">
                                        <span className="text-xs font-bold text-blue-800 dark:text-blue-200">
                                            {((tokenState.usages.reduce((sum, u) => sum + u.usage.totalTokens, 0) / tokenState.budget) * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {actionState && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">⚡</span>
                                <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-300">{t('currentStatus')}</h3>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="text-cyan-600 dark:text-cyan-400">{t('step')}:</span>
                                    <span className="px-2 py-1 rounded-full bg-cyan-200 dark:bg-cyan-800 font-bold text-cyan-800 dark:text-cyan-200">
                                        {actionState.totalStep}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-cyan-600 dark:text-cyan-400">{t('action')}:</span>
                                    <span className="px-2 py-1 rounded-full bg-pink-200 dark:bg-pink-800 font-mono text-pink-800 dark:text-pink-200">
                                        {actionState.thisStep.action}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        {/* 显示详细的中间结果 */}
                        <div className="mt-3 pl-10 pr-2 space-y-2">
                            {actionState.thisStep.think && (
                                <div className="text-xs text-cyan-700 dark:text-cyan-300 italic leading-relaxed flex items-start gap-1">
                                    <MessageCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {actionState.thisStep.think}
                                </div>
                            )}
                            
                            {/* Search Action 的详细信息 */}
                            {actionState.thisStep.action === 'search' && Array.isArray((actionState.thisStep as any).searchRequests) && (actionState.thisStep as any).searchRequests.length > 0 && (
                                <div className="bg-white/50 dark:bg-gray-800/50 rounded p-2 space-y-1">
                                    <div className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 flex items-center gap-1">
                                        <Search className="w-3.5 h-3.5" /> {t('searchQueriesLabel')}:
                                    </div>
                                    {(actionState.thisStep as any).searchRequests.map((query: string, idx: number) => (
                                        <div key={idx} className="text-xs text-cyan-600 dark:text-cyan-400 pl-4">
                                            • {query}
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {/* Visit Action 的详细信息 */}
                            {actionState.thisStep.action === 'visit' && (actionState.thisStep as any).URLTargets && 
                             Array.isArray((actionState.thisStep as any).URLTargets) && (actionState.thisStep as any).URLTargets.length > 0 && (
                                <div className="bg-white/50 dark:bg-gray-800/50 rounded p-2 space-y-1">
                                    <div className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 flex items-center gap-1">
                                        <Globe className="w-3.5 h-3.5" /> {t('visitUrlLabel')}:
                                    </div>
                                    {(actionState.thisStep as any).URLTargets.map((url: any, idx: number) => (
                                        <div key={idx} className="text-xs text-cyan-600 dark:text-cyan-400 pl-4 break-all">
                                            • {typeof url === 'string' ? url : `URL #${url}`}
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {/* Reflect Action 的详细信息 */}
                            {actionState.thisStep.action === 'reflect' && Array.isArray((actionState.thisStep as any).questionsToAnswer) && (actionState.thisStep as any).questionsToAnswer.length > 0 && (
                                <div className="bg-white/50 dark:bg-gray-800/50 rounded p-2 space-y-1">
                                    <div className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 flex items-center gap-1">
                                        <HelpCircle className="w-3.5 h-3.5" /> {t('reflectQuestionsLabel')}:
                                    </div>
                                    {(actionState.thisStep as any).questionsToAnswer.map((q: string, idx: number) => (
                                        <div key={idx} className="text-xs text-cyan-600 dark:text-cyan-400 pl-4">
                                            • {q}
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {/* Answer Action 的详细信息 */}
                            {actionState.thisStep.action === 'answer' && (actionState.thisStep as any).answer && typeof (actionState.thisStep as any).answer === 'string' && (
                                <div className="bg-white/50 dark:bg-gray-800/50 rounded p-2 space-y-1">
                                    <div className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 flex items-center gap-1">
                                        <Lightbulb className="w-3.5 h-3.5" /> {t('answerLabel')}:
                                    </div>
                                    <div className="text-xs text-cyan-600 dark:text-cyan-400 pl-4 leading-relaxed">
                                        {(actionState.thisStep as any).answer.substring(0, 200)}
                                        {(actionState.thisStep as any).answer.length > 200 && '...'}
                                    </div>
                                    {Array.isArray((actionState.thisStep as any).references) && (actionState.thisStep as any).references.length > 0 && (
                                        <div className="text-xs text-cyan-500 dark:text-cyan-400 pl-4 mt-1">
                                            <Library className="w-3.5 h-3.5 inline mr-1" /> {t('referencesCount')}: {(actionState.thisStep as any).references.length} {t('sources')}
                                        </div>
                                    )}
                                </div>
                            )}
                            {/* 显示知识差距 */}
                            {Array.isArray(actionState.gaps) && actionState.gaps.length > 0 && (
                                <div className="bg-orange-50/50 dark:bg-orange-900/20 rounded p-2 space-y-1 border border-orange-200 dark:border-orange-800">
                                    <div className="text-xs font-semibold text-orange-700 dark:text-orange-300 flex items-center gap-1">
                                        ⚠️ {t('knowledgeGaps')}:
                                    </div>
                                    {actionState.gaps.map((gap: string, idx: number) => (
                                        <div key={idx} className="text-xs text-orange-600 dark:text-orange-400 pl-4">
                                            • {gap}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {thoughts.map((step, index) => {
                        const isLatest = index === thoughts.length - 1;
                        return (
                            <div
                                key={index}
                                className={cn(
                                    "group relative pl-6 py-4 transition-all duration-500",
                                    "before:absolute before:left-0 before:top-0 before:h-full before:w-1",
                                    "before:bg-gradient-to-b before:from-blue-500 before:to-purple-500",
                                    "hover:before:opacity-100 before:opacity-50",
                                    "rounded-r-lg hover:bg-muted/30",
                                    "border border-transparent hover:cyan-200 dark:hover:cyan-800"
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    {/* 步骤指示器 */}
                                    <div className={cn(
                                        "flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full",
                                        "bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold",
                                        "shadow-lg ring-4 ring-blue-100 dark:ring-blue-900/30",
                                        isLatest && isConnected && "animate-bounce-gentle"
                                    )}>
                                        {step.stepNumber ? (
                                            <div className="text-center">
                                                <div className="text-[10px] leading-none opacity-80">步骤</div>
                                                <div className="text-base leading-none">{step.stepNumber}</div>
                                            </div>
                                        ) : (
                                            <div className="text-sm">{index + 1}</div>
                                        )}
                                    </div>
                                    
                                    {/* 思考内容 */}
                                    <div className="flex-1 min-w-0">
                                        <div className="prose dark:prose-invert max-w-none">
                                            <p className="text-sm leading-relaxed m-0 font-medium inline-flex items-center">
                                                {step.think}
                                                {isLatest && isConnected && (
                                                    <span className="inline-block w-0.5 h-4 ml-1 bg-blue-600 dark:bg-blue-400 animate-pulse" />
                                                )}
                                            </p>
                                        </div>
                                        
                                        {/* 详情展开/收起 */}
                                        {step.details && step.details.length > 0 && (
                                            <div className="mt-2">
                                                <button
                                                    onClick={() => {
                                                        setExpandedSteps(prev => {
                                                            const newSet = new Set(prev);
                                                            if (newSet.has(index)) {
                                                                newSet.delete(index);
                                                            } else {
                                                                newSet.add(index);
                                                            }
                                                            return newSet;
                                                        });
                                                    }}
                                                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
                                                >
                                                    <svg
                                                        className={cn(
                                                            "w-3 h-3 transition-transform duration-200",
                                                            expandedSteps.has(index) && "rotate-90"
                                                        )}
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                    <span>{expandedSteps.has(index) ? t('collapseDetails') : `${t('expandDetails')} (${step.details.length})`}</span>
                                                </button>
                                                
                                                {expandedSteps.has(index) && (
                                                    <div className="mt-2 pl-4 border-l-2 cyan-200 dark:cyan-800 space-y-1">
                                                        {step.details.map((detail, detailIndex) => (
                                                            <div
                                                                key={detailIndex}
                                                                className="text-xs text-muted-foreground leading-relaxed py-1"
                                                            >
                                                                {detail}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        
                                        {/* 最新步骤的动态指示器 */}
                                        {isLatest && isConnected && (
                                            <div className="flex items-center gap-2 mt-3 text-xs text-blue-600 dark:text-blue-400">
                                                <span className="font-medium">{t('deepThinking')}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {isConnected && thoughts.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-32 gap-4">
                            <div className="flex items-center gap-3">
                                {/* <Loader2 className="h-8 w-8 animate-spin text-blue-500" /> */}
                                <div className="flex gap-1">
                                    <span className="inline-block w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="inline-block w-3 h-3 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                    <span className="inline-block w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </div>
                            </div>
                            <span className="text-lg text-muted-foreground font-medium">{t('waitingForFirstStep')}</span>
                            <div className="w-64 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-progress-bar"></div>
                            </div>
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