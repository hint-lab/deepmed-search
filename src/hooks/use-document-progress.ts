/**
 * 文档处理进度 Hook
 * 使用 SSE 订阅 Redis 实时进度更新
 */

'use client';

import { useState, useEffect, useRef } from 'react';

// 客户端日志工具（使用 console 替代服务器端 logger）
const logger = {
    info: (message: string, data?: any) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[INFO] ${message}`, data || '');
        }
    },
    error: (message: string, data?: any) => {
        console.error(`[ERROR] ${message}`, data || '');
    },
    warn: (message: string, data?: any) => {
        console.warn(`[WARN] ${message}`, data || '');
    },
};

export interface DocumentProgressState {
    progress: number;
    progressMsg: string;
    status?: string;
    error?: string | null;
    isComplete: boolean;
    isConnected: boolean;
    metadata?: Record<string, any>;
}

export function useDocumentProgress(documentId: string | null) {
    const [state, setState] = useState<DocumentProgressState>({
        progress: 0,
        progressMsg: '准备处理...',
        status: undefined,
        error: null,
        isComplete: false,
        isConnected: false,
        metadata: undefined,
    });

    const eventSourceRef = useRef<EventSource | null>(null);
    const isSubscribedRef = useRef(false);

    useEffect(() => {
        if (!documentId) {
            return;
        }

        // 避免重复订阅
        if (isSubscribedRef.current) {
            if (process.env.NODE_ENV === 'development') {
                logger.info('[useDocumentProgress] Already subscribed, skipping', { documentId });
            }
            return;
        }

        if (process.env.NODE_ENV === 'development') {
            logger.info('[useDocumentProgress] Connecting to SSE', { documentId });
        }

        try {
            const eventSource = new EventSource(`/api/document/progress/${documentId}`);
            eventSourceRef.current = eventSource;
            isSubscribedRef.current = true;

            // 连接建立
            eventSource.onopen = () => {
                if (process.env.NODE_ENV === 'development') {
                    logger.info('[useDocumentProgress] SSE connected', { documentId });
                }
                setState((prev) => ({ ...prev, isConnected: true }));
            };

            // 监听进度事件
            eventSource.addEventListener('progress', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (process.env.NODE_ENV === 'development') {
                        logger.info('[useDocumentProgress] Progress event', { documentId, data });
                    }
                    setState((prev) => ({
                        ...prev,
                        progress: data.progress || prev.progress,
                        progressMsg: data.progressMsg || prev.progressMsg,
                        metadata: data.metadata || prev.metadata,
                    }));
                } catch (error) {
                    logger.error('[useDocumentProgress] Failed to parse progress event', { error });
                }
            });

            // 监听状态事件
            eventSource.addEventListener('status', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (process.env.NODE_ENV === 'development') {
                        logger.info('[useDocumentProgress] Status event', { documentId, data });
                    }
                    const newStatus = data.status;
                    setState((prev) => ({
                        ...prev,
                        status: newStatus || prev.status,
                        progressMsg: data.progressMsg || prev.progressMsg,
                        // 如果状态是 SUCCESSED，标记为完成
                        isComplete: newStatus === 'SUCCESSED' || prev.isComplete,
                        progress: newStatus === 'SUCCESSED' ? 100 : prev.progress,
                    }));
                } catch (error) {
                    logger.error('[useDocumentProgress] Failed to parse status event', { error });
                }
            });

            // 监听错误事件（服务器发送的错误）
            eventSource.addEventListener('error', (event: any) => {
                try {
                    // 检查是否有 data 字段（服务器发送的自定义错误事件才有）
                    if (!event.data) {
                        // 这不是服务器发送的错误事件，忽略
                        if (process.env.NODE_ENV === 'development') {
                            logger.warn('[useDocumentProgress] Received error event without data (likely connection issue)', { documentId });
                        }
                        return;
                    }

                    const data = JSON.parse(event.data);
                    logger.error('[useDocumentProgress] Server error event', { documentId, error: data.error });
                    setState((prev) => ({
                        ...prev,
                        error: data.error || '处理失败',
                        isComplete: true,
                        isConnected: false,
                    }));
                    eventSource.close();
                    isSubscribedRef.current = false;
                } catch (parseError) {
                    // 无法解析错误数据
                    logger.warn('[useDocumentProgress] Unable to parse error event data', { documentId, parseError });
                }
            });

            // 监听完成事件
            eventSource.addEventListener('complete', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (process.env.NODE_ENV === 'development') {
                        logger.info('[useDocumentProgress] Complete event', { documentId, data });
                    }
                    setState((prev) => ({
                        ...prev,
                        progress: 100,
                        progressMsg: '处理完成',
                        status: 'SUCCESSED', // 设置状态为 SUCCESSED
                        isComplete: true,
                        isConnected: false,
                        metadata: data.metadata || prev.metadata,
                    }));
                    eventSource.close();
                    isSubscribedRef.current = false;
                } catch (error) {
                    logger.error('[useDocumentProgress] Failed to parse complete event', { error });
                }
            });

            // 连接错误处理（网络错误或连接失败）
            eventSource.onerror = (error: Event) => {
                const readyState = eventSource.readyState;

                // readyState: 0 = CONNECTING, 1 = OPEN, 2 = CLOSED
                if (readyState === EventSource.CLOSED) {
                    // 连接已关闭，这通常是正常的（例如任务完成后服务器关闭连接）
                    // 只在开发环境记录日志
                    if (process.env.NODE_ENV === 'development') {
                        logger.info('[useDocumentProgress] SSE connection closed', {
                            documentId,
                            readyState
                        });
                    }

                    // 只有在非正常关闭时才更新状态
                    setState((prev) => {
                        // 如果已经完成，不需要更新状态
                        if (prev.isComplete) {
                            return prev;
                        }
                        return {
                            ...prev,
                            isConnected: false,
                        };
                    });

                    // 清理资源
                    if (!state.isComplete) {
                        eventSource.close();
                        isSubscribedRef.current = false;
                    }
                } else if (readyState === EventSource.CONNECTING) {
                    // 正在重连，这是正常的
                    if (process.env.NODE_ENV === 'development') {
                        logger.info('[useDocumentProgress] SSE reconnecting...', { documentId });
                    }
                    setState((prev) => ({
                        ...prev,
                        isConnected: false,
                    }));
                } else {
                    // 其他错误情况
                    logger.warn('[useDocumentProgress] SSE connection issue', {
                        documentId,
                        readyState,
                        errorType: error.type
                    });
                }
            };
        } catch (error) {
            logger.error('[useDocumentProgress] Failed to create EventSource', { documentId, error });
            setState((prev) => ({
                ...prev,
                error: '无法连接到服务器',
                isConnected: false,
            }));
        }

        // 清理函数
        return () => {
            if (process.env.NODE_ENV === 'development') {
                logger.info('[useDocumentProgress] Cleaning up', { documentId });
            }
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            isSubscribedRef.current = false;
        };
    }, [documentId]);

    return state;
}

