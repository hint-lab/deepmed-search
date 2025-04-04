import { useState, useCallback } from 'react';
import { changeDocumentParser } from '@/actions/document';
import { toast } from 'sonner';

export function useChangeDocumentParser(documentId: string) {
    const [changeParserLoading, setChangeParserLoading] = useState(false);
    const [changeParserVisible, setChangeParserVisible] = useState(false);

    const showChangeParserModal = () => {
        setChangeParserVisible(true);
    };

    const hideChangeParserModal = () => {
        setChangeParserVisible(false);
    };

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