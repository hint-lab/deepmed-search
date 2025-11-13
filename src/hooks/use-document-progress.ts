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
            logger.info('[useDocumentProgress] Already subscribed, skipping', { documentId });
            return;
        }

        logger.info('[useDocumentProgress] Connecting to SSE', { documentId });

        try {
            const eventSource = new EventSource(`/api/document/progress/${documentId}`);
            eventSourceRef.current = eventSource;
            isSubscribedRef.current = true;

            // 连接建立
            eventSource.onopen = () => {
                logger.info('[useDocumentProgress] SSE connected', { documentId });
                setState((prev) => ({ ...prev, isConnected: true }));
            };

            // 监听进度事件
            eventSource.addEventListener('progress', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    logger.info('[useDocumentProgress] Progress event', { documentId, data });
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
                    logger.info('[useDocumentProgress] Status event', { documentId, data });
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

            // 监听错误事件
            eventSource.addEventListener('error', (event: any) => {
                try {
                    const data = JSON.parse(event.data);
                    logger.error('[useDocumentProgress] Error event', { documentId, data });
                    setState((prev) => ({
                        ...prev,
                        error: data.error || '处理失败',
                        isComplete: true,
                        isConnected: false,
                    }));
                    eventSource.close();
                    isSubscribedRef.current = false;
                } catch (error) {
                    // 连接错误
                    logger.error('[useDocumentProgress] Connection error', { documentId, error });
                    setState((prev) => ({
                        ...prev,
                        error: '连接失败',
                        isConnected: false,
                    }));
                }
            });

            // 监听完成事件
            eventSource.addEventListener('complete', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    logger.info('[useDocumentProgress] Complete event', { documentId, data });
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

            // 连接错误处理
            eventSource.onerror = (error) => {
                logger.error('[useDocumentProgress] SSE connection error', { documentId, error });
                setState((prev) => ({
                    ...prev,
                    isConnected: false,
                }));
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
            logger.info('[useDocumentProgress] Cleaning up', { documentId });
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            isSubscribedRef.current = false;
        };
    }, [documentId]);

    return state;
}

