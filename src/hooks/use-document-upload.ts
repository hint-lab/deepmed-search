'use client';

import { useCallback, useState } from 'react';
import { uploadDocumentAction } from '@/actions/document';
import { useSetModalState } from '@/hooks/use-modal';


interface UseUploadDocumentOptions {
    maxFileSize?: number;
    allowedTypes?: string[];
    onSuccess?: (fileData: any) => void;
    onError?: (error: Error) => void;
}

export function useUploadDocument(
    kbId: string, options: UseUploadDocumentOptions = {}) {
    const { visible, showModal, hideModal } = useSetModalState();
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    const {
        maxFileSize = 10 * 1024 * 1024, // 默认 10MB
        allowedTypes = ['*'],
        onSuccess,
        onError
    } = options;

    const validateFile = (file: File): string | null => {
        if (maxFileSize && file.size > maxFileSize) {
            return `文件大小超过限制 (${maxFileSize / 1024 / 1024}MB)`;
        }

        if (allowedTypes.length > 0 && !allowedTypes.includes('*')) {
            const fileType = file.type.split('/')[0];
            if (!allowedTypes.includes(fileType)) {
                return `不支持的文件类型: ${file.type}`;
            }
        }

        return null;
    };

    const showDocumentUploadModal = useCallback(() => {
        showModal();
    }, [showModal]);

    const hideDocumentUploadModal = useCallback(() => {
        hideModal();
    }, [hideModal]);

    const onDocumentUploadOk = useCallback(async (file: File) => {
        setIsUploading(true);
        setUploadProgress(0);

        try {
            const error = validateFile(file);
            if (error) {
                throw new Error(error);
            }

            const result = await uploadDocumentAction(kbId, [file]);
            if (result.success) {
                setUploadProgress(100);
                hideDocumentUploadModal();
                onSuccess?.(result.data);
                return result;
            } else {
                throw new Error(result.error || '上传失败');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '上传失败';
            onError?.(new Error(errorMessage));
            return null;
        } finally {
            setIsUploading(false);
        }
    }, [kbId, hideDocumentUploadModal, onSuccess, onError]);

    return {
        documentUploadModalVisible: visible,
        uploadProgress,
        isUploading,
        showDocumentUploadModal,
        hideDocumentUploadModal,
        onDocumentUploadOk,
    };
}
