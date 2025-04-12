import { useState, useCallback } from 'react';
import { changeDocumentParserAction } from '@/actions/document';
import { toast } from 'sonner';

/**
 * 文档解析器修改 Hook
 * @param documentId - 要修改解析器的文档 ID
 * @returns {
 *   changeParserLoading: boolean;      // 修改解析器时的加载状态
 *   onChangeParserOk: Function;        // 确认修改解析器的回调函数
 *   changeParserVisible: boolean;      // 修改解析器弹窗的显示状态
 *   hideChangeParserModal: Function;   // 隐藏修改解析器弹窗的回调函数
 *   showChangeParserModal: Function;   // 显示修改解析器弹窗的回调函数
 * }
 */
export function useChangeDocumentParser(documentId: string) {
    const [changeParserLoading, setChangeParserLoading] = useState(false);
    const [changeParserVisible, setChangeParserVisible] = useState(false);

    const showChangeParserModal = () => setChangeParserVisible(true);
    const hideChangeParserModal = () => setChangeParserVisible(false);

    const onChangeParserOk = useCallback(async (config: any) => {
        if (!documentId) return;
        setChangeParserLoading(true);
        try {
            const result = await changeDocumentParserAction(documentId, config.parserId, config.parserConfig);
            if (result.success) {
                hideChangeParserModal();
                toast.success('修改成功');
            }
        } finally {
            setChangeParserLoading(false);
        }
    }, [documentId, hideChangeParserModal]);

    return {
        changeParserLoading,
        onChangeParserOk,
        changeParserVisible,
        hideChangeParserModal,
        showChangeParserModal,
    };
}


/**
 * 处理文档分块的 Hook
 * @returns 处理文档分块的方法和加载状态
 */
export const useProcessDocumentChunks = () => {
    const [isProcessingDocumentToChunks, setIsProcessingDocumentToChunks] = useState(false);


    const startProcessingDocumentToChunks = useCallback(async (document: IDocumentInfo) => {
        try {
            setIsProcessingDocumentToChunks(true);
            const result = await processDocumentToChunksAction(document.id);
            return {
                success: false,
                data: result
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '文档分块处理失败'
            }
        } finally {
            setIsProcessingDocumentToChunks(false);
        }
    }, []);

    const cancelProcessingDocumentToChunks = useCallback(async (document: IDocumentInfo) => {
        try {
            setIsProcessingDocumentToChunks(true);
            // TODO: 实现取消处理的 API
        } catch (error) {
        } finally {
            setIsProcessingDocumentToChunks(false);
        }
    }, []);

    const retryProcessingDocumentToChunks = useCallback(async (document: IDocumentInfo) => {
        try {
            setIsProcessingDocumentToChunks(true);
            const result = await processDocumentToChunksAction(document.id);

            if (result.success) {
            } else {
            }
        } catch (error) {
        } finally {
            setIsProcessingDocumentToChunks(false);
        }
    }, []);

    return {
        startProcessingDocumentToChunks,
        cancelProcessingDocumentToChunks,
        retryProcessingDocumentToChunks,
        isProcessingDocumentToChunks,
    };
};

/**
 * 调用zerox将其他格式如pdf转换为markdown
 * @param file 文件
 * @returns 转换后的文件
 */
export const useZeroxConvertToMarkdown = () => {
    const [jobId, setJobId] = useState<string | null>(null);
    const [jobStatus, setJobStatus] = useState<'waiting' | 'processing' | 'completed' | 'failed' | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // 使用队列进行异步转换
    const convertAnyToMarkdown = useCallback(async (documentId: string) => {
        try {
            setIsLoading(true);
            setJobStatus('processing');

            // 尝试使用Server Action添加转换任务到文档转换队列
            try {
                const result = await addTaskAction(TASK_TYPES.DOCUMENT_CONVERT, {
                    documentId,
                    timestamp: Date.now()
                });

                if (result.success && result.jobId) {
                    setJobId(result.jobId);
                    setJobStatus('waiting');
                    return {
                        success: true,
                        jobId: result.jobId,
                        message: '文档转换任务已加入队列，将在后台处理'
                    };
                } else if (result.error && result.error.includes('无效的队列名称')) {
                    // 队列系统可能未启用，直接调用转换操作
                    console.log('队列系统未启用，直接执行转换操作');

                    // 直接调用server action
                    const directResult = await convertToMarkdownAction(documentId);

                    if (directResult.success) {
                        setJobStatus('completed');
                        return {
                            success: true,
                            message: '文档转换完成'
                        };
                    } else {
                        setJobStatus('failed');
                        return {
                            success: false,
                            error: directResult.error || '文档转换失败'
                        };
                    }
                } else {
                    setJobStatus('failed');
                    return {
                        success: false,
                        error: result.error || '添加转换任务到队列失败'
                    };
                }
            } catch (error) {
                // 队列系统可能不可用，直接调用转换操作
                if (error instanceof Error && error.message.includes('队列')) {
                    console.log('队列系统异常，直接执行转换操作:', error);

                    // 直接调用server action
                    const directResult = await convertToMarkdownAction(documentId);

                    if (directResult.success) {
                        setJobStatus('completed');
                        return {
                            success: true,
                            message: '文档转换完成（直接模式）'
                        };
                    } else {
                        setJobStatus('failed');
                        return {
                            success: false,
                            error: directResult.error || '文档转换失败'
                        };
                    }
                }

                // 其他错误直接抛出
                throw error;
            }
        } catch (error) {
            setJobStatus('failed');
            return {
                success: false,
                error: error instanceof Error ? error.message : '添加转换任务失败'
            };
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 获取任务状态
    const checkJobStatus = useCallback(async () => {
        if (!jobId) return null;

        try {
            // 使用Server Action获取队列状态
            const statusResult = await getTaskStatusAction(jobId);

            if (statusResult.success) {
                const result = statusResult as { success: true; result: { queues?: any[] } };
                // 查找文档转换队列
                const convertQueue = result.result.queues?.find((queue: any) => queue.name === 'document-convert');

                if (convertQueue && 'active' in convertQueue) {
                    // 只有当队列对象有这些属性时才使用它们
                    if (convertQueue.active > 0) {
                        setJobStatus('processing');
                    } else if (convertQueue.completed > 0) {
                        setJobStatus('completed');
                    } else if (convertQueue.failed > 0) {
                        setJobStatus('failed');
                    } else {
                        setJobStatus('waiting');
                    }
                }

                return statusResult;
            }
            return null;
        } catch (error) {
            console.error('检查队列任务状态失败:', error);
            return null;
        }
    }, [jobId]);

    // 在组件挂载后自动检查任务状态
    useEffect(() => {
        if (jobId && jobStatus !== 'completed' && jobStatus !== 'failed') {
            const interval = setInterval(checkJobStatus, 3000);
            return () => clearInterval(interval);
        }
    }, [jobId, jobStatus, checkJobStatus]);

    return {
        convertAnyToMarkdown,
        jobId,
        jobStatus,
        isLoading,
        checkJobStatus
    };
}
