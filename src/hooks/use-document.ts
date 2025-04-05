'use client';

import { IReferenceChunk } from '@/types/db/chat';
import { IDocumentInfo, IDocumentMetaRequestBody } from '@/types/db/document';
import { IChunk } from '@/types/db/knowledge-base';
import { useCallback, useMemo, useState } from 'react';
import { IHighlight } from 'react-pdf-highlighter';
import { toast } from 'sonner';
import { getDocumentList, uploadDocument, changeDocumentParser, runDocument, renameDocument, deleteDocument, setDocumentMeta as setDocumentMetaAction } from '@/actions/document';
import { buildChunkHighlights } from '@/utils/document-util';
import { ActionResponse } from '@/lib/auth-utils';

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
            const result = await getDocumentList(kbId, page, pageSize, keywords);
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
            const result = await uploadDocument(kbId, [file]);
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
            const result = await changeDocumentParser(documentId, config.parserId, config.parserConfig);
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
            const result = await runDocument(documentId, isRunning);
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
export function useRenameDocument(documentId: string) {
    const [renameLoading, setRenameLoading] = useState(false);

    const rename = useCallback(async (name: string) => {
        if (!documentId) return;
        setRenameLoading(true);
        try {
            const result = await renameDocument(documentId, name);
            if (result.success) {
                toast.success('重命名成功');
            }
        } finally {
            setRenameLoading(false);
        }
    }, [documentId]);

    return {
        renameLoading,
        rename,
    };
}

/**
 * 删除文档的 hook
 * @param documentId 文档 ID
 * @returns 删除加载状态和删除方法
 */
export function useDeleteDocument(documentId: string) {
    const [deleteLoading, setDeleteLoading] = useState(false);

    const deleteDoc = useCallback(async () => {
        if (!documentId) return;
        setDeleteLoading(true);
        try {
            const result = await deleteDocument(documentId);
            if (result.success) {
                toast.success('删除成功');
            }
        } finally {
            setDeleteLoading(false);
        }
    }, [documentId]);

    return {
        deleteLoading,
        deleteDoc,
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
