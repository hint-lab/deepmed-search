'use client';

import { useState, useCallback } from 'react';
import { Switch } from "@/components/ui/switch";
import { setDocumentMetaAction } from '@/actions/document';
import { toast } from 'sonner';
import { useTranslate } from '@/hooks/use-language';

interface DocumentSwitchProps {
    documentId: string;
    initialEnabled: boolean;
    onToggle?: (enabled: boolean) => void;
}

export function DocumentSwitch({ documentId, initialEnabled, onToggle }: DocumentSwitchProps) {
    const [localEnabled, setLocalEnabled] = useState(initialEnabled);
    const { t } = useTranslate('knowledgeBase.table');

    const handleToggle = useCallback(async (checked: boolean) => {
        try {
            const result = await setDocumentMetaAction({
                id: documentId,
                meta: JSON.stringify({ enabled: checked })
            });

            if (!result.success) {
                throw new Error(result.error);
            }

            setLocalEnabled(checked);
            onToggle?.(checked);
        } catch (error) {
            toast.error(t('toggleError', '切换状态失败'));
            // 恢复原始状态
            setLocalEnabled(!checked);
        }
    }, [documentId, onToggle, t]);

    return (
        <Switch
            id={`status-${documentId}`}
            className="scale-75"
            checked={localEnabled}
            onCheckedChange={(checked) => {
                setLocalEnabled(checked);
                setTimeout(() => {
                    handleToggle(checked);
                }, 500);
            }}
        />
    );
} 