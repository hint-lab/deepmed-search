import { Badge } from '@/components/ui/badge';
import { Play, RotateCw, CircleCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslate } from '@/contexts/language-context';
import { IDocumentProcessingStatus } from '@/types/enums';
import { IDocument } from '@/types/document';
import { useState, useEffect, useRef } from 'react';
import { processDocumentAction, updateDocumentProcessingStatusAction, getDocumentStatusAction } from '@/actions/document-process';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDocumentProgress } from '@/hooks/use-document-progress';

// 环形进度条组件 - 增强动画效果
const CircularProgress = ({ progress, size = 16 }: { progress: number; size?: number }) => {
    const radius = (size - 3) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
            {/* 外层脉冲动画 - 呼吸效果 */}
            <div 
                className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping" 
                style={{ 
                    animationDuration: '1.5s',
                    animationIterationCount: 'infinite',
                    width: size + 4,
                    height: size + 4,
                    margin: -2
                }} 
            />
            
            <svg className="transform -rotate-90 relative z-10" width={size} height={size}>
                {/* 背景圆环 - 带脉冲 */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    opacity="0.3"
                    className="animate-pulse"
                    style={{ animationDuration: '2s' }}
                />
                {/* 进度圆环 - 增强视觉效果 */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="2.5"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out animate-pulse"
                    style={{
                        filter: 'drop-shadow(0 0 3px currentColor)',
                        animationDuration: '1.5s'
                    }}
                />
            </svg>
        </div>
    );
};

interface DocumentProcessingBadgeProps {
    document: IDocument;
    onRefresh?: () => void;
}

export function DocumentProcessingBadge({ document, onRefresh }: DocumentProcessingBadgeProps) {
    const { t } = useTranslate('knowledgeBase.table');
    const [status, setStatus] = useState<IDocumentProcessingStatus>(
        document.processing_status || IDocumentProcessingStatus.UNPROCESSED
    );
    const [currentProgressMsg, setCurrentProgressMsg] = useState<string | null | undefined>(document.progress_msg);
    const previousStatusRef = useRef<IDocumentProcessingStatus>(document.processing_status || IDocumentProcessingStatus.UNPROCESSED);
    
    // 使用 SSE 实时进度（仅在处理中时）
    const isProcessing = status === IDocumentProcessingStatus.CONVERTING || 
                         status === IDocumentProcessingStatus.INDEXING ||
                         status === IDocumentProcessingStatus.CONVERTED; // CONVERTED 状态也需要监听，因为可能即将开始索引
    const progressState = useDocumentProgress(isProcessing ? document.id : null);
    
    // 使用 SSE 进度（所有进度都通过 SSE 推送）
    const currentProgress = progressState.progress || document.progress || 0;

    // 监听 SSE 进度更新
    useEffect(() => {
        if (!isProcessing) return;
        
        // 更新进度消息
        if (progressState.progressMsg) {
            setCurrentProgressMsg(progressState.progressMsg);
        }
        
        // 更新状态（从 SSE 接收）
        if (progressState.status && progressState.status !== status) {
            console.log('[ProcessingBadge] 状态更新', {
                documentId: document.id,
                oldStatus: status,
                newStatus: progressState.status
            });
            setStatus(progressState.status as IDocumentProcessingStatus);
            previousStatusRef.current = progressState.status as IDocumentProcessingStatus;
        }
        
        // 处理完成 - 检查完成事件或进度达到100%
        const isComplete = progressState.isComplete || 
                          (progressState.progress >= 100 && 
                           (previousStatusRef.current === IDocumentProcessingStatus.CONVERTING || 
                            previousStatusRef.current === IDocumentProcessingStatus.INDEXING ||
                            previousStatusRef.current === IDocumentProcessingStatus.CONVERTED));
        
        if (isComplete) {
            const wasProcessing = previousStatusRef.current === IDocumentProcessingStatus.CONVERTING || 
                                 previousStatusRef.current === IDocumentProcessingStatus.INDEXING;
            
            if (wasProcessing) {
                if (progressState.error) {
                    setStatus(IDocumentProcessingStatus.FAILED);
                    previousStatusRef.current = IDocumentProcessingStatus.FAILED;
                    setCurrentProgressMsg(progressState.error);
                    
                    toast.error(t('documentProcessingStatus.failed'), {
                        description: progressState.error
                    });
                } else {
                    // 转换完成，document-worker 会自动添加索引任务到队列
                    // 前端只需要等待索引完成即可（通过 SSE 监听进度）
                    if (previousStatusRef.current === IDocumentProcessingStatus.CONVERTING && progressState.metadata?.converted) {
                        // 转换完成，状态应该已经是 CONVERTED，等待索引开始
                        setCurrentProgressMsg('转换完成，等待分块索引...');
                        setStatus(IDocumentProcessingStatus.CONVERTED);
                        previousStatusRef.current = IDocumentProcessingStatus.CONVERTED;
                        toast.info('转换完成，等待索引', {
                            description: `${document.name}`
                        });
                    } else if (previousStatusRef.current === IDocumentProcessingStatus.CONVERTED && progressState.status === IDocumentProcessingStatus.INDEXING) {
                        // 从 CONVERTED 转换到 INDEXING
                        setCurrentProgressMsg('开始索引...');
                        setStatus(IDocumentProcessingStatus.INDEXING);
                        previousStatusRef.current = IDocumentProcessingStatus.INDEXING;
                    } else {
                        // 完全处理完成
                        setStatus(IDocumentProcessingStatus.SUCCESSED);
                        previousStatusRef.current = IDocumentProcessingStatus.SUCCESSED;
                        setCurrentProgressMsg('处理完成');
                        
                        toast.success(t('processingCompleted'), {
                            description: `${document.name} ${t('documentProcessingStatus.successed')}`
                        });
                    }
                }
                
                onRefresh?.();
            }
        }
    }, [progressState, isProcessing, document.name, onRefresh, t]);

    const handleClick = async () => {
        if (status === IDocumentProcessingStatus.CONVERTING ||
            status === IDocumentProcessingStatus.INDEXING ||
            status === IDocumentProcessingStatus.CONVERTED) {
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

            // 使用队列模式处理文档
            const result = await processDocumentAction(
                document.id,
                { model: 'gpt-4o-mini', maintainFormat: true }
            );

            if (result.success) {
                toast.success(t('processingTaskStarted'));
                // SSE 会自动开始接收进度更新
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

    // SSE 会自动处理进度订阅，不再需要轮询

    useEffect(() => {
        const initialDocStatus = document.processing_status || IDocumentProcessingStatus.UNPROCESSED;
        setStatus(initialDocStatus);
        previousStatusRef.current = initialDocStatus; // 同步更新 ref
        setCurrentProgressMsg(document.progress_msg);
    }, [document.processing_status, document.progress_msg]);

    // showProgress 基于合并后的 currentProgress（已在上面定义）
    const showProgress = (status === IDocumentProcessingStatus.CONVERTING || 
                          status === IDocumentProcessingStatus.INDEXING) && 
                         currentProgress > 0;

    const badgeConfig = {
        [IDocumentProcessingStatus.SUCCESSED]: {
            variant: 'default' as const,
            className: 'text-xs bg-green-500/10 text-green-600 hover:bg-green-500/20',
            content: t('documentProcessingStatus.successed'),
            icon: <CircleCheck className="h-3 w-3" />,
            tooltip: t('documentProcessingStatus.successed')
        },
        [IDocumentProcessingStatus.CONVERTED]: {
            variant: 'secondary' as const,
            className: 'text-xs flex items-center gap-1.5 bg-yellow-500/10 text-yellow-600 border border-yellow-500/20',
            content: (
                <span className="flex items-center gap-1.5">
                    {t('documentProcessingStatus.converted')}
                </span>
            ),
            icon: <CircleCheck className="h-3 w-3" />,
            tooltip: t('documentProcessingStatus.converted')
        },
        [IDocumentProcessingStatus.CONVERTING]: {
            variant: 'secondary' as const,
            className: 'text-xs flex items-center gap-1.5 bg-blue-500/10 text-blue-600 border border-blue-500/20 animate-pulse',
            content: showProgress ? (
                <span className="flex items-center gap-1.5">
                    <span className="animate-pulse">{t('documentProcessingStatus.converting')}</span>
                    <span className="font-bold text-blue-700 dark:text-blue-400 animate-pulse">{Math.round(currentProgress)}%</span>
                </span>
            ) : (
                <span className="animate-pulse">{t('documentProcessingStatus.converting')}</span>
            ),
            icon: showProgress ? (
                <CircularProgress progress={currentProgress} size={14} />
            ) : (
                <RotateCw className="h-3 w-3 animate-spin" />
            ),
            tooltip: currentProgressMsg || `${t('documentProcessingStatus.converting')} ${Math.round(currentProgress)}%`
        },
        [IDocumentProcessingStatus.INDEXING]: {
            variant: 'secondary' as const,
            className: 'text-xs flex items-center gap-1.5 bg-blue-500/10 text-blue-600 border border-blue-500/20 animate-pulse',
            content: showProgress ? (
                <span className="flex items-center gap-1.5">
                    <span className="animate-pulse">{t('documentProcessingStatus.indexing')}</span>
                    <span className="font-bold text-blue-700 dark:text-blue-400 animate-pulse">{Math.round(currentProgress)}%</span>
                </span>
            ) : (
                <span className="animate-pulse">{t('documentProcessingStatus.indexing')}</span>
            ),
            icon: showProgress ? (
                <CircularProgress progress={currentProgress} size={14} />
            ) : (
                <RotateCw className="h-3 w-3 animate-spin" />
            ),
            tooltip: currentProgressMsg || `${t('documentProcessingStatus.indexing')} ${Math.round(currentProgress)}%`
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