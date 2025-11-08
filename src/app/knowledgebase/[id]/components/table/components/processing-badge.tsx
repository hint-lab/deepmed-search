import { Badge } from '@/components/ui/badge';
import { Play, RotateCw, CircleCheck, AlertTriangle } from 'lucide-react';
import { useTranslate } from '@/contexts/language-context';
import { IDocumentProcessingStatus } from '@/types/enums';
import { IDocument } from '@/types/document';
import { useState, useEffect, useRef } from 'react';
import { processDocumentDirectlyAction, updateDocumentProcessingStatusAction, getDocumentStatusAction } from '@/actions/document-process';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DocumentProcessingBadgeProps {
    document: IDocument;
    onRefresh?: () => void;
}

const POLLING_INTERVAL = 5000; // 缩短轮询间隔到5秒，更快检测状态变化

export function DocumentProcessingBadge({ document, onRefresh }: DocumentProcessingBadgeProps) {
    const { t } = useTranslate('knowledgeBase.table');
    const [status, setStatus] = useState<IDocumentProcessingStatus>(
        document.processing_status || IDocumentProcessingStatus.UNPROCESSED
    );
    const [currentProgressMsg, setCurrentProgressMsg] = useState<string | null | undefined>(document.progress_msg);
    const isPollingActive = useRef(false);
    const intervalId = useRef<NodeJS.Timeout | null>(null);
    const previousStatusRef = useRef<IDocumentProcessingStatus>(document.processing_status || IDocumentProcessingStatus.UNPROCESSED);

    const fetchAndUpdateStatus = async () => {
        try {
            const result = await getDocumentStatusAction(document.id);
            if (result.success && result.data) {
                const newStatus = result.data.processing_status;
                const oldStatus = previousStatusRef.current; // 使用 ref 保存的状态，避免闭包问题
                setCurrentProgressMsg(result.data.progress_msg);

                if (newStatus !== oldStatus) { // 只有状态实际变化时才更新
                    setStatus(newStatus);
                    previousStatusRef.current = newStatus; // 更新 ref

                    const isNowFinal = newStatus === IDocumentProcessingStatus.SUCCESSED || newStatus === IDocumentProcessingStatus.FAILED;
                    const wasPreviouslyFinal = oldStatus === IDocumentProcessingStatus.SUCCESSED || oldStatus === IDocumentProcessingStatus.FAILED;

                    if (isNowFinal) {
                        stopPolling();
                        // 只有当状态从非最终变为最终时才刷新和显示toast
                        if (!wasPreviouslyFinal) {
                            console.log(`[Polling] Document ${document.id} changed from ${oldStatus} to final state ${newStatus}. Refreshing table.`);
                            
                            // 显示处理完成的toast通知
                            if (newStatus === IDocumentProcessingStatus.SUCCESSED) {
                                toast.success(t('processingCompleted'), {
                                    description: `${document.name} ${t('documentProcessingStatus.successed')}`
                                });
                            } else if (newStatus === IDocumentProcessingStatus.FAILED) {
                                toast.error(t('documentProcessingStatus.failed'), {
                                    description: result.data.progress_msg || `${document.name} 处理失败`
                                });
                            }
                            
                            onRefresh?.();
                        }
                    } else if (newStatus === IDocumentProcessingStatus.CONVERTING || newStatus === IDocumentProcessingStatus.INDEXING) {
                        // 保持轮询激活状态 (无需操作)
                    } else {
                        stopPolling(); // 其他未知状态也停止轮询
                    }
                } else if (newStatus !== IDocumentProcessingStatus.CONVERTING && newStatus !== IDocumentProcessingStatus.INDEXING) {
                    // 如果状态没变，但已经不是处理中状态，也停止轮询
                    stopPolling();
                }
            } else {
                console.error(`[Polling] 获取文档 ${document.id} 状态失败:`, result.error);
                stopPolling();
            }
        } catch (error) {
            console.error(`[Polling] 轮询文档 ${document.id} 状态时出错:`, error);
            stopPolling();
        }
    };

    const startPolling = () => {
        if (isPollingActive.current) return;
        isPollingActive.current = true;
        fetchAndUpdateStatus();
        intervalId.current = setInterval(fetchAndUpdateStatus, POLLING_INTERVAL);
        console.log(`Polling started for document ${document.id}`);
    };

    const stopPolling = () => {
        if (intervalId.current) {
            clearInterval(intervalId.current);
            intervalId.current = null;
        }
        isPollingActive.current = false;
        console.log(`Polling stopped for document ${document.id}`);
    };

    const handleClick = async () => {
        if (status === IDocumentProcessingStatus.CONVERTING ||
            status === IDocumentProcessingStatus.INDEXING) {
            toast.info(t('processingWait'));
            return;
        }
        else if (status === IDocumentProcessingStatus.SUCCESSED) {
            toast.info(t('processingCompleted'));
            return;
        }

        try {
            setStatus(IDocumentProcessingStatus.CONVERTING);
            setCurrentProgressMsg(t('processingStart'));
            await updateDocumentProcessingStatusAction(
                document.id,
                IDocumentProcessingStatus.CONVERTING,
                { progress: 0, progressMsg: t('processingStart') }
            );

            const result = await processDocumentDirectlyAction(
                document.id,
                document.knowledgeBaseId,
                { model: 'gpt-4o-mini', maintainFormat: true }
            );

            if (result.success) {
                toast.success(t('processingTaskStarted'));
                startPolling();
            } else {
                setStatus(IDocumentProcessingStatus.FAILED);
                setCurrentProgressMsg(result.error || t('processingStartFailed'));
                await updateDocumentProcessingStatusAction(
                    document.id,
                    IDocumentProcessingStatus.FAILED,
                    { progress: 0, progressMsg: result.error || t('processingStartFailed'), error: result.error }
                );
                toast.error(t('processingStartFailed') + ': ' + (result.error || t('unknownError2')));
                onRefresh?.();
            }
        } catch (error) {
            console.error('处理文档失败:', error);
            setStatus(IDocumentProcessingStatus.FAILED);
            setCurrentProgressMsg(t('processingError'));
            toast.error(t('processingError'));
            await updateDocumentProcessingStatusAction(
                document.id,
                IDocumentProcessingStatus.FAILED,
                { progress: 0, progressMsg: t('processingError'), error: error instanceof Error ? error.message : String(error) }
            ).catch(err => console.error("更新失败状态时出错:", err));
            onRefresh?.();
        }
    };

    useEffect(() => {
        if (status === IDocumentProcessingStatus.CONVERTING || status === IDocumentProcessingStatus.INDEXING) {
            startPolling();
        }
        return () => {
            stopPolling();
        };
    }, [status]);

    useEffect(() => {
        const initialDocStatus = document.processing_status || IDocumentProcessingStatus.UNPROCESSED;
        setStatus(initialDocStatus);
        previousStatusRef.current = initialDocStatus; // 同步更新 ref
        setCurrentProgressMsg(document.progress_msg);
        if (initialDocStatus === IDocumentProcessingStatus.CONVERTING || initialDocStatus === IDocumentProcessingStatus.INDEXING) {
            startPolling();
        } else {
            stopPolling();
        }
    }, [document.processing_status, document.progress_msg]);

    const badgeConfig = {
        [IDocumentProcessingStatus.SUCCESSED]: {
            variant: 'default' as const,
            className: 'text-xs bg-green-500/10 text-green-600 hover:bg-green-500/20',
            content: t('documentProcessingStatus.successed'),
            icon: <CircleCheck className="h-3 w-3" />,
            tooltip: t('documentProcessingStatus.successed')
        },
        [IDocumentProcessingStatus.CONVERTING]: {
            variant: 'secondary' as const,
            className: 'text-xs flex items-center gap-1 bg-blue-500/10 text-blue-600',
            content: t('documentProcessingStatus.converting'),
            icon: <RotateCw className="h-3 w-3 animate-spin" />,
            tooltip: currentProgressMsg || t('documentProcessingStatus.converting')
        },
        [IDocumentProcessingStatus.INDEXING]: {
            variant: 'secondary' as const,
            className: 'text-xs flex items-center gap-1 bg-blue-500/10 text-blue-600',
            content: t('documentProcessingStatus.indexing'),
            icon: <RotateCw className="h-3 w-3 animate-spin" />,
            tooltip: currentProgressMsg || t('documentProcessingStatus.indexing')
        },
        [IDocumentProcessingStatus.FAILED]: {
            variant: 'destructive' as const,
            className: 'text-xs hover:cursor-pointer flex items-center gap-1 bg-red-500/10 text-red-600 hover:bg-red-500/20',
            content: t('documentProcessingStatus.failed'),
            icon: <AlertTriangle className="h-3 w-3" />,
            tooltip: currentProgressMsg || t('documentProcessingStatus.failed')
        },
        [IDocumentProcessingStatus.UNPROCESSED]: {
            variant: 'outline' as const,
            className: 'text-xs hover:cursor-pointer flex items-center gap-1 bg-gray-500/10 text-gray-600 hover:bg-gray-500/20',
            content: t('convertToMarkdown'),
            icon: <Play className="h-3 w-3" />,
            tooltip: t('clickToProcess')
        }
    };

    const config = badgeConfig[status] || badgeConfig[IDocumentProcessingStatus.UNPROCESSED];
    const isClickable = status === IDocumentProcessingStatus.FAILED ||
        status === IDocumentProcessingStatus.UNPROCESSED;

    return (
        <TooltipProvider>
            <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                    <Badge
                        variant={config.variant}
                        className={config.className}
                        onClick={isClickable ? handleClick : undefined}
                    >
                        {config.icon}
                        {config.content}
                    </Badge>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{config.tooltip}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
} 