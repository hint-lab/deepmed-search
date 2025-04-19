'use client';

import { useCallback, useState } from 'react';
import { getDocumentListAction, changeDocumentParserAction, renameDocumentAction, deleteDocumentAction, setDocumentMetaAction } from '@/actions/document';
import { IDocumentMetaRequestBody } from '@/types/db/document';

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
            console.log("result", result)
            if (result.success) {
                setDocuments(result.data.items);
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

/**
 * 切换文档启用状态
 * @param documentId - 文档ID
 * @param enabled - 是否启用
 * @param onSuccess - 成功回调函数
 * @returns 切换结果
 */
export function useToggleDocumentEnabled() {
    const [loading, setLoading] = useState(false);
    const toggleDocumentEnabled = useCallback(async (documentId: string, enabled: boolean, onSuccess?: (newEnabled: boolean) => void) => {
        try {
            setLoading(true);
            const result = await setDocumentMetaAction(documentId, {
                documentId,
                meta: JSON.stringify({ enabled })
            });

            if (result.success) {
                if (onSuccess) {
                    onSuccess(enabled);
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('切换文档启用状态失败:', error);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        toggleDocumentEnabled
    };
}