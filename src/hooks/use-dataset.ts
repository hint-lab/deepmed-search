'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useSetDialogState } from '@/hooks/use-dialog';
import { IDocumentInfo } from '@/types/db/document';
import { IChangeParserConfigRequestBody } from '@/types/db/document';
import { getUnSupportedFilesCount } from '@/utils/document-util';
import {
    getDocumentList,
    uploadDocument,
    changeDocumentParser,
    runDocument,
    renameDocument,
    deleteDocument,
} from '@/actions/document';

export function useDataset(kbId: string) {
    const router = useRouter();
    const { t } = useTranslation('translation', { keyPrefix: 'dataset' });
    const [documents, setDocuments] = useState<IDocumentInfo[]>([]);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    const [loading, setLoading] = useState(false);
    const [searchString, setSearchString] = useState('');

    const fetchDocuments = useCallback(async (page: number = 1) => {
        setLoading(true);
        try {
            const response = await getDocumentList(kbId, page, pagination.pageSize, searchString);
            if (response.success) {
                setDocuments(response.data.docs);
                setPagination(prev => ({ ...prev, total: response.data.total }));
            }
        } catch (error) {
            console.error('获取文档列表失败:', error);
        } finally {
            setLoading(false);
        }
    }, [kbId, pagination.pageSize, searchString]);

    const handleSearch = useCallback((value: string) => {
        setSearchString(value);
        setPagination(prev => ({ ...prev, current: 1 }));
    }, []);

    const handlePageChange = useCallback((page: number) => {
        setPagination(prev => ({ ...prev, current: page }));
    }, []);

    const handleUpload = useCallback(async (files: File[]) => {
        try {
            const result = await uploadDocument(kbId, files);
            if (result.success || (result.success && getUnSupportedFilesCount(result.error || '') !== files.length)) {
                fetchDocuments();
            }
            return result.success;
        } catch (error) {
            console.error('上传文档失败:', error);
            return false;
        }
    }, [kbId, fetchDocuments]);

    const handleChangeParser = useCallback(async (
        documentId: string,
        parserId: string,
        parserConfig: IChangeParserConfigRequestBody
    ) => {
        try {
            const response = await changeDocumentParser(documentId, parserId, parserConfig);
            if (response.success) {
                fetchDocuments();
            }
            return response.success;
        } catch (error) {
            console.error('修改分块方法失败:', error);
            return false;
        }
    }, [fetchDocuments]);

    const handleRunDocument = useCallback(async (documentId: string, isRunning: boolean) => {
        try {
            const response = await runDocument(documentId, isRunning);
            if (response.success) {
                fetchDocuments();
            }
            return response.success;
        } catch (error) {
            console.error('运行文档失败:', error);
            return false;
        }
    }, [fetchDocuments]);

    const handleRename = useCallback(async (documentId: string, name: string) => {
        try {
            const response = await renameDocument(documentId, name);
            if (response.success) {
                fetchDocuments();
            }
            return response.success;
        } catch (error) {
            console.error('重命名文档失败:', error);
            return false;
        }
    }, [fetchDocuments]);

    const handleDelete = useCallback(async (documentId: string) => {
        try {
            const response = await deleteDocument(documentId);
            if (response.success) {
                fetchDocuments();
            }
            return response.success;
        } catch (error) {
            console.error('删除文档失败:', error);
            return false;
        }
    }, [fetchDocuments]);

    return {
        documents,
        pagination,
        loading,
        searchString,
        handleSearch,
        handlePageChange,
        handleUpload,
        handleChangeParser,
        handleRunDocument,
        handleRename,
        handleDelete,
        fetchDocuments,
    };
}

export function useDatasetDialog() {
    const {
        visible: documentUploadVisible,
        hideDialog: hideDocumentUploadModal,
        showDialog: showDocumentUploadModal,
    } = useSetDialogState();

    const {
        visible: chunkMethodVisible,
        hideDialog: hideChunkMethodModal,
        showDialog: showChunkMethodModal,
    } = useSetDialogState();

    return {
        documentUploadVisible,
        hideDocumentUploadModal,
        showDocumentUploadModal,
        chunkMethodVisible,
        hideChunkMethodModal,
        showChunkMethodModal,
    };
} 