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