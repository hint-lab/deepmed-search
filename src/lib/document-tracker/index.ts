/**
 * 文档处理进度跟踪器
 * 使用 Redis 发布订阅机制实时推送文档处理进度
 */

import { getRedisClient } from '@/lib/redis-client';
import logger from '@/utils/logger';

export interface DocumentProgressEvent {
    type: 'progress' | 'status' | 'error' | 'complete';
    documentId: string;
    timestamp: number;
    data: {
        status?: string;
        progress?: number;
        progressMsg?: string;
        error?: string;
        metadata?: Record<string, any>;
    };
}

/**
 * 获取文档进度 Redis 频道名称
 */
function getDocumentChannel(documentId: string): string {
    return `document:progress:${documentId}`;
}

/**
 * 发布文档进度事件到 Redis
 */
export async function publishDocumentProgress(
    documentId: string,
    event: Omit<DocumentProgressEvent, 'documentId' | 'timestamp'>
): Promise<void> {
    try {
        const redis = await getRedisClient();
        const channel = getDocumentChannel(documentId);

        const fullEvent: DocumentProgressEvent = {
            ...event,
            documentId,
            timestamp: Date.now(),
        };

        await redis.publish(channel, JSON.stringify(fullEvent));

        logger.info('[Document Tracker] 发布进度事件', {
            documentId,
            type: event.type,
            channel,
        });
    } catch (error) {
        logger.error('[Document Tracker] 发布进度事件失败', {
            documentId,
            error: error instanceof Error ? error.message : '未知错误',
        });
    }
}

/**
 * 更新文档进度（同时更新数据库和发布到 Redis）
 */
export async function updateDocumentProgress(
    documentId: string,
    progress: number,
    progressMsg: string,
    metadata?: Record<string, any>
): Promise<void> {
    await publishDocumentProgress(documentId, {
        type: 'progress',
        data: {
            progress,
            progressMsg,
            metadata,
        },
    });
}

/**
 * 更新文档状态
 */
export async function updateDocumentStatus(
    documentId: string,
    status: string,
    progressMsg?: string
): Promise<void> {
    await publishDocumentProgress(documentId, {
        type: 'status',
        data: {
            status,
            progressMsg,
        },
    });
}

/**
 * 报告文档处理错误
 */
export async function reportDocumentError(
    documentId: string,
    error: string
): Promise<void> {
    await publishDocumentProgress(documentId, {
        type: 'error',
        data: {
            error,
        },
    });
}

/**
 * 报告文档处理完成
 */
export async function reportDocumentComplete(
    documentId: string,
    metadata?: Record<string, any>
): Promise<void> {
    await publishDocumentProgress(documentId, {
        type: 'complete',
        data: {
            metadata,
        },
    });
}

/**
 * 订阅文档进度（用于 SSE）
 */
export async function subscribeDocumentProgress(
    documentId: string,
    callback: (event: DocumentProgressEvent) => void
): Promise<() => void> {
    const redis = getRedisClient();
    const subscriber = redis.duplicate();

    const channel = getDocumentChannel(documentId);

    // 订阅频道
    await subscriber.subscribe(channel);

    // 监听消息
    subscriber.on('message', (ch: string, message: string) => {
        if (ch === channel) {
            try {
                const event: DocumentProgressEvent = JSON.parse(message);
                callback(event);
            } catch (error) {
                logger.error('[Document Tracker] 解析进度事件失败', {
                    documentId,
                    error: error instanceof Error ? error.message : '未知错误',
                });
            }
        }
    });

    logger.info('[Document Tracker] 订阅文档进度', {
        documentId,
        channel,
    });

    // 返回取消订阅函数
    return async () => {
        await subscriber.unsubscribe(channel);
        await subscriber.quit();
        logger.info('[Document Tracker] 取消订阅文档进度', {
            documentId,
            channel,
        });
    };
}

