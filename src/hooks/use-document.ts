'use client';

import { IReferenceChunk } from '@/types/db/chat';
import { IDocumentInfo, IDocumentMetaRequestBody } from '@/types/db/document';
import { IChunk } from '@/types/db/knowledge-base';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { IHighlight } from 'react-pdf-highlighter';
import { getDocumentListAction, uploadDocumentAction, changeDocumentParserAction, renameDocumentAction, deleteDocumentAction, setDocumentMetaAction, convertToMarkdownAction, processDocumentToChunksAction } from '@/actions/document';
import { buildChunkHighlights } from '@/utils/document-util';
import { addTaskAction, getTaskStatusAction } from '@/actions/queue';
import { TASK_TYPES } from '@/lib/queue-constants';
/**
 * 用于生成文档高亮显示的 hook
 * @param selectedChunk 选中的文本块
 * @returns 高亮显示配置和设置尺寸的方法
 */
export const useGetChunkHighlights = (
    selectedChunk: IChunk | IReferenceChunk,
) => {
    const [size, setSize] = useState({ width: 849, height: 1200 });

    const highlights: IHighlight[] = useMemo(() => {
        return buildChunkHighlights(selectedChunk as IChunk, size);
    }, [selectedChunk, size]);

    const setWidthAndHeight = (width: number, height: number) => {
        setSize((pre) => {
            if (pre.height !== height || pre.width !== width) {
                return { height, width };
            }
            return pre;
        });
    };

    return { highlights, setWidthAndHeight };
};

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

/**
 * 获取文档列表的 hook
 * @param kbId 知识库 ID
 * @returns 文档列表、分页信息、搜索和翻页方法
 */
export function useFetchDocumentList(kbId: string) {
    const [documents, setDocuments] = useState<any[]>([]);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    const [loading, setLoading] = useState(false);
    const [searchString, setSearchString] = useState('');
    const [error, setError] = useState<Error | null>(null);

    const fetchDocuments = useCallback(async (page: number = 1, pageSize: number = 10, keywords?: string) => {
        try {
            setLoading(true);
            setError(null);
            const result = await getDocumentListAction(kbId, page, pageSize, keywords);
            if (result.success) {
                setDocuments(result.data.docs);
                setPagination({
                    current: page,
                    pageSize,
                    total: result.data.total,
                });
                return result.data;
            } else {
                setError(new Error(result.error || '获取文档列表失败'));
                return null;
            }
        } catch (err) {
            setError(err instanceof Error ? err : new Error('获取文档列表失败'));
            return null;
        } finally {
            setLoading(false);
        }
    }, [kbId]);

    const handleSearch = useCallback((value: string) => {
        setSearchString(value);
        fetchDocuments(1, pagination.pageSize, value);
    }, [fetchDocuments, pagination.pageSize]);

    const handlePageChange = useCallback((page: number) => {
        fetchDocuments(page, pagination.pageSize, searchString);
    }, [fetchDocuments, pagination.pageSize, searchString]);

    const refreshData = useCallback(() => {
        return fetchDocuments(pagination.current, pagination.pageSize, searchString);
    }, [fetchDocuments, pagination.current, pagination.pageSize, searchString]);

    return {
        documents,
        pagination,
        loading,
        error,
        searchString,
        handleSearch,
        handlePageChange,
        setPagination,
        refreshData,
    };
}

/**
 * 修改文档解析器的 hook
 * @param documentId 文档 ID
 * @returns 修改解析器模态框状态、加载状态和相关操作方法
 */
export function useChangeDocumentParser(documentId: string) {
    const [changeParserLoading, setChangeParserLoading] = useState(false);
    const [changeParserVisible, setChangeParserVisible] = useState(false);

    const showChangeParserModal = useCallback(() => {
        setChangeParserVisible(true);
    }, []);

    const hideChangeParserModal = useCallback(() => {
        setChangeParserVisible(false);
    }, []);

    const onChangeParserOk = useCallback(async (config: any) => {
        if (!documentId) return;
        setChangeParserLoading(true);
        try {
            const result = await changeDocumentParserAction(documentId, config.parserId, config.parserConfig);
            if (result.success) {
                hideChangeParserModal();
                return result;
            }
            return result;
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
 * 重命名文档的 hook
 * @param documentId 文档 ID
 * @returns 重命名加载状态和重命名方法
 */
export function useRenameDocument() {
    const [renameLoading, setRenameLoading] = useState(false);

    const renameDocument = useCallback(async (documentId: string, name: string) => {
        setRenameLoading(true);
        try {
            const result = await renameDocumentAction(documentId, name);
            return result;
        } finally {
            setRenameLoading(false);
        }
    }, []);

    return {
        renameLoading,
        renameDocument,
    };
}

/**
 * 删除文档的 hook
 * @returns 删除加载状态和删除方法
 */
export function useDeleteDocument() {
    const [deleteLoading, setDeleteLoading] = useState(false);

    const deleteDocument = useCallback(async (documentId: string) => {
        setDeleteLoading(true);
        try {
            const result = await deleteDocumentAction(documentId);
            return result;
        } finally {
            setDeleteLoading(false);
        }
    }, []);

    return {
        deleteLoading,
        deleteDocument,
    };
}

/**
 * 设置文档元数据的 hook
 * @returns 设置元数据的加载状态和设置方法
 */
export const useSetDocumentMeta = () => {
    const [loading, setLoading] = useState(false);

    const setDocumentMeta = useCallback(async (params: IDocumentMetaRequestBody): Promise<boolean> => {
        setLoading(true);
        try {
            const result = await setDocumentMetaAction(params.documentId, { documentId: params.documentId, meta: params.meta });
            return result.success;
        } finally {
            setLoading(false);
        }
    }, []);

    return { setDocumentMeta, loading };
};
