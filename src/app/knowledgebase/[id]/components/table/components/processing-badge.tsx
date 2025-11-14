import { Badge } from '@/components/ui/badge';
import { Play, RotateCw, CircleCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslate } from '@/contexts/language-context';
import { IDocumentProcessingStatus } from '@/types/enums';
import { IDocument } from '@/types/document';
import { useState, useEffect, useRef, useMemo } from 'react';
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
    const lastProgressRef = useRef<number>(document.progress || 0); // 记录上一次的进度，防止回退
    
    // 使用 SSE 实时进度（仅在处理中时）
    const isProcessing = status === IDocumentProcessingStatus.CONVERTING || 
                         status === IDocumentProcessingStatus.INDEXING ||
                         status === IDocumentProcessingStatus.CONVERTED; // CONVERTED 状态也需要监听，因为可能即将开始索引
    const progressState = useDocumentProgress(isProcessing ? document.id : null);
    
    // 使用 SSE 进度（所有进度都通过 SSE 推送）
    // 如果正在处理中，优先使用 SSE 的进度；如果不在处理中，使用数据库的进度
    // 防止进度回退：如果新进度小于上次进度且不是处理刚开始，保持上次进度
    let currentProgress = 0;
    if (isProcessing && progressState.progress !== undefined && progressState.progress !== null) {
        // 正在处理中，使用 SSE 进度
        // 如果进度回退（且不是从0开始的新处理），保持上次进度
        if (progressState.progress < lastProgressRef.current && lastProgressRef.current > 0 && progressState.progress > 0) {
            currentProgress = lastProgressRef.current;
        } else {
            currentProgress = progressState.progress;
            lastProgressRef.current = progressState.progress;
        }
    } else {
        // 不在处理中，使用数据库进度
        currentProgress = document.progress || 0;
        lastProgressRef.current = currentProgress;
    }

    // 监听 SSE 进度更新
    useEffect(() => {
        // 优先检查状态更新（即使不在处理中，也要处理状态变化）
        // 注意：progressState.status 可能为空字符串，需要检查是否为有效状态
        // 使用 previousStatusRef 而不是 status 来避免无限循环
        if (progressState.status && progressState.status !== previousStatusRef.current.toString() && progressState.status.trim() !== '') {
            const newStatus = progressState.status as IDocumentProcessingStatus;
            console.log('[ProcessingBadge] SSE 状态更新', {
                documentId: document.id,
                oldStatus: previousStatusRef.current,
                newStatus: newStatus,
                dbStatus: document.processing_status
            });
            
            // 如果状态变为 SUCCESSED，立即更新（只在这里触发一次成功提示）
            if (newStatus === IDocumentProcessingStatus.SUCCESSED) {
                // 只有在之前不是 SUCCESSED 状态时才触发提示和刷新
                if (previousStatusRef.current !== IDocumentProcessingStatus.SUCCESSED) {
                    setStatus(IDocumentProcessingStatus.SUCCESSED);
                    previousStatusRef.current = IDocumentProcessingStatus.SUCCESSED;
                    setCurrentProgressMsg(progressState.progressMsg || '处理完成');
                    
                    toast.success(t('processingCompleted'), {
                        description: `${document.name} ${t('documentProcessingStatus.successed')}`
                    });
                    
                    onRefresh?.();
                } else {
                    // 如果已经是 SUCCESSED，只更新消息，不触发提示和状态更新
                    if (progressState.progressMsg) {
                        setCurrentProgressMsg(progressState.progressMsg);
                    }
                }
                return;
            }
            
            // 如果状态变为 FAILED，立即更新
            if (newStatus === IDocumentProcessingStatus.FAILED) {
                if (previousStatusRef.current !== IDocumentProcessingStatus.FAILED) {
                    setStatus(IDocumentProcessingStatus.FAILED);
                    previousStatusRef.current = IDocumentProcessingStatus.FAILED;
                    setCurrentProgressMsg(progressState.error || progressState.progressMsg || '处理失败');
                    
                    toast.error(t('documentProcessingStatus.failed'), {
                        description: progressState.error || '处理失败'
                    });
                    
                    onRefresh?.();
                } else {
                    // 如果已经是 FAILED，只更新消息，不触发提示和状态更新
                    if (progressState.error || progressState.progressMsg) {
                        setCurrentProgressMsg(progressState.error || progressState.progressMsg || '处理失败');
                    }
                }
                return;
            }
            
            // 其他状态更新（CONVERTING, INDEXING, CONVERTED）
            // 优先使用 SSE 的实时状态，避免被数据库状态覆盖
            const oldStatus = previousStatusRef.current;
            setStatus(newStatus);
            previousStatusRef.current = newStatus;
            if (progressState.progressMsg) {
                setCurrentProgressMsg(progressState.progressMsg);
            }
            // 如果状态变为处理中状态，更新进度记录
            if (newStatus === IDocumentProcessingStatus.CONVERTING || 
                newStatus === IDocumentProcessingStatus.INDEXING) {
                // 新处理开始，重置进度记录
                if (oldStatus === IDocumentProcessingStatus.UNPROCESSED ||
                    oldStatus === IDocumentProcessingStatus.FAILED ||
                    oldStatus === IDocumentProcessingStatus.SUCCESSED) {
                    lastProgressRef.current = 0;
                }
            }
        }
        
        // 如果不在处理中，不再处理进度更新
        if (!isProcessing) return;
        
        // 更新进度消息
        if (progressState.progressMsg) {
            setCurrentProgressMsg(progressState.progressMsg);
        }
        
        // 更新进度记录（防止回退）
        if (progressState.progress !== undefined && progressState.progress !== null) {
            if (progressState.progress >= lastProgressRef.current) {
                lastProgressRef.current = progressState.progress;
            }
        }
        
        // 处理完成 - 检查完成事件或进度达到100%
        // 注意：这里不再重复检查 SUCCESSED 状态，因为上面已经处理过了
        const isComplete = progressState.isComplete || 
                          (progressState.status === IDocumentProcessingStatus.SUCCESSED) ||
                          (progressState.progress >= 100 && 
                           (previousStatusRef.current === IDocumentProcessingStatus.CONVERTING || 
                            previousStatusRef.current === IDocumentProcessingStatus.INDEXING ||
                            previousStatusRef.current === IDocumentProcessingStatus.CONVERTED));
        
        if (isComplete && previousStatusRef.current !== IDocumentProcessingStatus.SUCCESSED && previousStatusRef.current !== IDocumentProcessingStatus.FAILED) {
            const wasProcessing = previousStatusRef.current === IDocumentProcessingStatus.CONVERTING || 
                                 previousStatusRef.current === IDocumentProcessingStatus.INDEXING ||
                                 previousStatusRef.current === IDocumentProcessingStatus.CONVERTED;
            
            if (wasProcessing) {
                if (progressState.error) {
                    setStatus(IDocumentProcessingStatus.FAILED);
                    previousStatusRef.current = IDocumentProcessingStatus.FAILED;
                    setCurrentProgressMsg(progressState.error);
                    
                    toast.error(t('documentProcessingStatus.failed'), {
                        description: progressState.error
                    });
                } else if (progressState.status === IDocumentProcessingStatus.SUCCESSED || progressState.isComplete) {
                    // 后端明确发送了 SUCCESSED 状态或完成事件（但上面状态更新可能已经处理过了）
                    // 这里只做状态同步，不触发提示（避免重复）
                    setStatus(IDocumentProcessingStatus.SUCCESSED);
                    previousStatusRef.current = IDocumentProcessingStatus.SUCCESSED;
                    setCurrentProgressMsg(progressState.progressMsg || '处理完成');
                } else if (previousStatusRef.current === IDocumentProcessingStatus.INDEXING && progressState.progress >= 100) {
                    // 索引完成，进度100%，状态应该变为 SUCCESSED
                    setStatus(IDocumentProcessingStatus.SUCCESSED);
                    previousStatusRef.current = IDocumentProcessingStatus.SUCCESSED;
                    setCurrentProgressMsg('处理完成');
                    
                    toast.success(t('processingCompleted'), {
                        description: `${document.name} ${t('documentProcessingStatus.successed')}`
                    });
                } else if (previousStatusRef.current === IDocumentProcessingStatus.CONVERTING && progressState.metadata?.converted) {
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
                } else if (progressState.progress >= 100 && !progressState.error) {
                    // 其他情况，如果进度100%且没有错误，应该完成
                    setStatus(IDocumentProcessingStatus.SUCCESSED);
                    previousStatusRef.current = IDocumentProcessingStatus.SUCCESSED;
                    setCurrentProgressMsg('处理完成');
                    
                    toast.success(t('processingCompleted'), {
                        description: `${document.name} ${t('documentProcessingStatus.successed')}`
                    });
                }
                
                onRefresh?.();
            }
        }
    }, [progressState, isProcessing, document.id, document.name, onRefresh, t]);

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
            // 如果状态是 CONVERTED，processDocumentAction 会自动继续索引
            // 如果状态是 UNPROCESSED 或 FAILED，processDocumentAction 会开始转换
            if (status === IDocumentProcessingStatus.CONVERTED) {
                setStatus(IDocumentProcessingStatus.INDEXING);
                setCurrentProgressMsg('开始索引...');
                previousStatusRef.current = IDocumentProcessingStatus.INDEXING;
            } else {
            setStatus(IDocumentProcessingStatus.CONVERTING);
            setCurrentProgressMsg(t('processingStart'));
            previousStatusRef.current = IDocumentProcessingStatus.CONVERTING;
            await updateDocumentProcessingStatusAction(
                document.id,
                IDocumentProcessingStatus.CONVERTING,
                { progress: 0, progressMsg: t('processingStart') }
            );
            }
            
            lastProgressRef.current = 0; // 重置进度记录

            // processDocumentAction 会根据文档状态自动处理：
            // - CONVERTED: 直接添加索引任务
            // - 其他状态: 添加转换任务
            const result = await processDocumentAction(
                document.id,
                { model: 'gpt-4o-mini', maintainFormat: true }
            );

            if (result.success) {
                if (status === IDocumentProcessingStatus.CONVERTED) {
                    toast.success('索引任务已开始');
                } else {
                toast.success(t('processingTaskStarted'));
                }
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

    // 简化状态同步逻辑：数据库只记录4个状态（UNPROCESSED, CONVERTED, SUCCESSED, FAILED）
    // CONVERTING 和 INDEXING 只从 SSE 获取，不写入数据库
    useEffect(() => {
        const dbStatus = document.processing_status || IDocumentProcessingStatus.UNPROCESSED;
        
        // 数据库状态只可能是：UNPROCESSED, CONVERTED, SUCCESSED, FAILED
        // 如果当前状态是 CONVERTING 或 INDEXING（来自 SSE），且数据库状态是 CONVERTED，不覆盖
        // 如果当前状态是 CONVERTING 或 INDEXING，且数据库状态是 SUCCESSED 或 FAILED，使用数据库状态
        // 如果当前状态不是处理中状态，使用数据库状态
        
        // 使用 ref 来获取当前状态，避免依赖 status 导致无限循环
        // 但我们需要知道当前显示的状态来判断是否是临时状态
        // 使用 previousStatusRef 来判断，因为它会在 setStatus 时同步更新
        const currentStatus = previousStatusRef.current;
        const isTemporaryStatus = currentStatus === IDocumentProcessingStatus.CONVERTING || 
                                 currentStatus === IDocumentProcessingStatus.INDEXING;
        
        // 如果当前状态是临时状态（CONVERTING/INDEXING），且数据库状态是 CONVERTED，保持临时状态
        if (isTemporaryStatus && dbStatus === IDocumentProcessingStatus.CONVERTED) {
            return; // 保持 SSE 的临时状态
        }
        
        // 如果当前状态是临时状态，但数据库状态是 SUCCESSED 或 FAILED，使用数据库状态
        if (isTemporaryStatus && 
            (dbStatus === IDocumentProcessingStatus.SUCCESSED || 
             dbStatus === IDocumentProcessingStatus.FAILED)) {
            // 临时状态（CONVERTING/INDEXING）与数据库状态（SUCCESSED/FAILED）不同，需要更新
            setStatus(dbStatus);
            previousStatusRef.current = dbStatus;
            setCurrentProgressMsg(document.progress_msg);
            return;
        }
        
        // 如果当前状态不是临时状态，且与数据库状态不一致，使用数据库状态
        if (!isTemporaryStatus && currentStatus !== dbStatus) {
            setStatus(dbStatus);
            previousStatusRef.current = dbStatus;
            setCurrentProgressMsg(document.progress_msg);
        }
    }, [document.processing_status, document.progress_msg]);

    // showProgress 基于合并后的 currentProgress（已在上面定义）
    const showProgress = (status === IDocumentProcessingStatus.CONVERTING || 
                          status === IDocumentProcessingStatus.INDEXING) && 
                         currentProgress > 0;

    // 使用 useMemo 记忆化配置，避免每次渲染都创建新的 React 元素
    const config = useMemo(() => {
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
        return badgeConfig[status] || badgeConfig[IDocumentProcessingStatus.UNPROCESSED];
    }, [status, showProgress, currentProgress, currentProgressMsg, t]);

    const isClickable = status === IDocumentProcessingStatus.FAILED ||
        status === IDocumentProcessingStatus.UNPROCESSED ||
        status === IDocumentProcessingStatus.CONVERTED;

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