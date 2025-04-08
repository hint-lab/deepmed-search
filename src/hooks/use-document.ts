'use client';

import { IReferenceChunk } from '@/types/db/chat';
import { IDocumentInfo, IDocumentMetaRequestBody } from '@/types/db/document';
import { IChunk } from '@/types/db/knowledge-base';
import { useCallback, useMemo, useState } from 'react';
import { IHighlight } from 'react-pdf-highlighter';
import { toast } from 'sonner';
import { getDocumentListAction, uploadDocumentAction, changeDocumentParserAction, renameDocumentAction, deleteDocumentAction, setDocumentMetaAction, convertToMarkdownAction, processDocumentToChunksAction } from '@/actions/document';
import { buildChunkHighlights } from '@/utils/document-util';
import { useRouter } from 'next/navigation';
import { Row } from '@tanstack/react-table';

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

            if (result.success) {
                toast.success('文档分块处理已完成');
            } else {
                toast.error(result.error || '文档分块处理失败');
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '文档分块处理失败');
        } finally {
            setIsProcessingDocumentToChunks(false);
        }
    }, []);

    const cancelProcessingDocumentToChunks = useCallback(async (document: IDocumentInfo) => {
        try {
            setIsProcessingDocumentToChunks(true);
            // TODO: 实现取消处理的 API
            toast.success('已取消处理');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '取消处理失败');
        } finally {
            setIsProcessingDocumentToChunks(false);
        }
    }, []);

    const retryProcessingDocumentToChunks = useCallback(async (document: IDocumentInfo) => {
        try {
            setIsProcessingDocumentToChunks(true);
            const result = await processDocumentToChunksAction(document.id);

            if (result.success) {
                toast.success('重新处理成功');
            } else {
                toast.error(result.error || '重新处理失败');
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '重新处理失败');
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
    const convertAnyToMarkdown = useCallback(async (documentId: string) => {
        const result = await convertToMarkdownAction(documentId);
        return result;
    }, []);

    return { convertAnyToMarkdown };
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
 * 文档上传相关的 hook
 * @param kbId 知识库 ID
 * @returns 上传模态框状态、加载状态和相关操作方法
 */
export function useUploadDocument(kbId: string) {
    const [documentUploadVisible, setDocumentUploadVisible] = useState(false);
    const [documentUploadLoading, setDocumentUploadLoading] = useState(false);

    const showDocumentUploadModal = useCallback(() => {
        setDocumentUploadVisible(true);
    }, []);

    const hideDocumentUploadModal = useCallback(() => {
        setDocumentUploadVisible(false);
    }, []);

    const onDocumentUploadOk = useCallback(async (file: File) => {
        setDocumentUploadLoading(true);
        try {
            const result = await uploadDocumentAction(kbId, [file]);
            if (result.success) {
                toast.success('上传成功');
                hideDocumentUploadModal();
                return result;
            } else {
                toast.error(result.error || '上传失败');
                return null;
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '上传失败');
            return null;
        } finally {
            setDocumentUploadLoading(false);
        }
    }, [kbId, hideDocumentUploadModal]);

    return {
        documentUploadVisible,
        documentUploadLoading,
        showDocumentUploadModal,
        hideDocumentUploadModal,
        onDocumentUploadOk,
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
 * 运行文档的 hook
 * @param documentId 文档 ID
 * @returns 运行状态和运行方法
 */
export function useRunDocument(documentId: string) {
    const [runLoading, setRunLoading] = useState(false);

    const run = useCallback(async (isRunning: boolean) => {
        if (!documentId) return;
        setRunLoading(true);
        try {
            const result = await runDocumentAction(documentId, isRunning);
            if (result.success) {
                toast.success('运行成功');
            }
        } finally {
            setRunLoading(false);
        }
    }, [documentId]);

    return {
        runLoading,
        run,
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
            if (result.success) {
                toast.success('重命名成功');
            }
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
            if (result.success) {
                toast.success('删除成功');
                return result.data;
            } else {
                toast.error(result.error || '删除失败');
                return null;
            }
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
            if (result.success) {
                toast.success('修改成功');
            }
            return result.success;
        } finally {
            setLoading(false);
        }
    }, []);

    return { setDocumentMeta, loading };
};
