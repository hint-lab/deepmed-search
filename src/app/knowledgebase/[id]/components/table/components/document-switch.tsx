'use client';

import { useState, useCallback } from 'react';
import { Switch } from "@/components/ui/switch";
import { setDocumentMetaAction } from '@/actions/document';
import { toast } from 'sonner';
import { useTranslate } from '@/contexts/language-context';

interface DocumentSwitchProps {
    documentId: string;
    checked: boolean;
    onToggle: (newCheckedState: boolean) => void;
}

export function DocumentSwitch({ documentId, checked, onToggle }: DocumentSwitchProps) {
    const { t } = useTranslate('knowledgeBase.table.fileStatus');
    const [isLoading, setIsLoading] = useState(false);

    const handleCheckedChange = useCallback(async (newCheckedState: boolean) => {
        setIsLoading(true);
        try {
            const result = await setDocumentMetaAction({
                id: documentId,
                meta: JSON.stringify({ enabled: newCheckedState })
            });

            if (!result.success) {
                throw new Error(result.error || t('toggleError'));
            }

            onToggle(newCheckedState);
            toast.success(t('toggleSuccess'));

        } catch (error: any) {
            console.error("Failed to update document enabled status:", error);
            toast.error(t('toggleError'), {
                description: error.message
            });
        } finally {
            setIsLoading(false);
        }
    }, [documentId, onToggle, t]);

    return (
        <Switch
            id={`status-${documentId}`}
            className="scale-75"
            checked={checked}
            onCheckedChange={handleCheckedChange}
            disabled={isLoading}
        />
    );
} 