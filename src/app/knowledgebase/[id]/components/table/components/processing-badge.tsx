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

const POLLING_INTERVAL = 5000;

export function DocumentProcessingBadge({ document, onRefresh }: DocumentProcessingBadgeProps) {
    const { t } = useTranslate('knowledgeBase.table');
    const [status, setStatus] = useState<IDocumentProcessingStatus>(
        document.processing_status || IDocumentProcessingStatus.UNPROCESSED
    );
    const [currentProgressMsg, setCurrentProgressMsg] = useState<string | null | undefined>(document.progress_msg);
    const isPollingActive = useRef(false);
    const intervalId = useRef<NodeJS.Timeout | null>(null);

    const fetchAndUpdateStatus = async () => {
        try {
            const result = await getDocumentStatusAction(document.id);
            if (result.success && result.data) {
                const newStatus = result.data.processing_status;
                setCurrentProgressMsg(result.data.progress_msg);
                if (newStatus !== status) {
                    setStatus(newStatus);
                    if (newStatus === IDocumentProcessingStatus.SUCCESSED || newStatus === IDocumentProcessingStatus.FAILED) {
                        stopPolling();
                        onRefresh?.();
                    }
                    else if (newStatus === IDocumentProcessingStatus.CONVERTING || newStatus === IDocumentProcessingStatus.INDEXING) {
                        // 保持轮询激活状态
                    } else {
                        stopPolling();
                    }
                }
            } else {
                console.error("获取文档状态失败:", result.error);
                stopPolling();
            }
        } catch (error) {
            console.error('轮询文档状态时出错:', error);
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
            toast.info(t('processingWait', "正在处理中，请耐心等待..."));
            return;
        }
        else if (status === IDocumentProcessingStatus.SUCCESSED) {
            toast.info(t('processingCompleted', "文档已处理完成"));
            return;
        }

        try {
            setStatus(IDocumentProcessingStatus.CONVERTING);
            setCurrentProgressMsg(t('processingStart', '开始处理'));
            await updateDocumentProcessingStatusAction(
                document.id,
                IDocumentProcessingStatus.CONVERTING,
                { progress: 0, progressMsg: t('processingStart', '开始处理') }
            );

            const result = await processDocumentDirectlyAction(
                document.id,
                document.knowledgeBaseId,
                { model: 'gpt-4o-mini', maintainFormat: true }
            );

            if (result.success) {
                toast.success(t('processingTaskStarted', '处理任务已启动'));
                startPolling();
            } else {
                setStatus(IDocumentProcessingStatus.FAILED);
                setCurrentProgressMsg(result.error || t('processingStartFailed', '启动处理失败'));
                await updateDocumentProcessingStatusAction(
                    document.id,
                    IDocumentProcessingStatus.FAILED,
                    { progress: 0, progressMsg: result.error || t('processingStartFailed', '启动处理失败'), error: result.error }
                );
                toast.error(t('processingStartFailed', '启动处理失败') + ': ' + (result.error || '未知错误'));
                onRefresh?.();
            }
        } catch (error) {
            console.error('处理文档失败:', error);
            setStatus(IDocumentProcessingStatus.FAILED);
            setCurrentProgressMsg(t('processingError', '处理文档时出错'));
            toast.error(t('processingError', '处理文档时出错'));
            await updateDocumentProcessingStatusAction(
                document.id,
                IDocumentProcessingStatus.FAILED,
                { progress: 0, progressMsg: t('processingError', '处理文档时出错'), error: error instanceof Error ? error.message : String(error) }
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
            tooltip: t('clickToProcess', '点击开始处理')
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