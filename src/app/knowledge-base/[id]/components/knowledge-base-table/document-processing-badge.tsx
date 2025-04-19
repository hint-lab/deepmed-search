import { Badge } from '@/components/ui/badge';
import { Play, RotateCw, CircleCheck } from 'lucide-react';
import { useTranslate } from '@/hooks/use-language';
import { DocumentProcessingStatus } from '@/types/db/enums';
import { IDocument } from '@/types/db/document';
import { useState } from 'react';
import { processDocumentDirectlyAction, updateDocumentProcessingStatusAction } from '@/actions/document-process';
import { toast } from 'sonner';

interface DocumentProcessingBadgeProps {
    document: IDocument;
}

export function DocumentProcessingBadge({ document }: DocumentProcessingBadgeProps) {
    const { t } = useTranslate('knowledgeBase.table');
    const [status, setStatus] = useState<DocumentProcessingStatus>(
        document.processing_status || DocumentProcessingStatus.UNPROCESSED
    );

    const handleClick = async () => {
        if (status === DocumentProcessingStatus.CONVERTING ||
            status === DocumentProcessingStatus.INDEXING) {
            toast.error("正在处理中，请耐心等待...")
            return;
        }
        else if (status === DocumentProcessingStatus.SUCCESSED) {
            toast.error("文档已处理完成");
            return;
        }

        try {
            setStatus(DocumentProcessingStatus.CONVERTING);
            await updateDocumentProcessingStatusAction(
                document.id,
                DocumentProcessingStatus.CONVERTING,
                { progress: 0, progressMsg: '开始处理' }
            );

            const result = await processDocumentDirectlyAction(
                document.id,
                document.knowledgeBaseId,
                { model: 'gpt-4o-mini', maintainFormat: true }
            );

            if (!result.success) {
                setStatus(DocumentProcessingStatus.FAILED);
                await updateDocumentProcessingStatusAction(
                    document.id,
                    DocumentProcessingStatus.FAILED,
                    { progress: 0, progressMsg: result.error || '处理失败', error: result.error }
                );
                toast.error('转换失败: ' + (result.error || '未知错误'));
                return;
            }

        } catch (error) {
            console.error('处理文档失败:', error);
            setStatus(DocumentProcessingStatus.FAILED);
            toast.error('处理文档失败');
        }
    };

    const badgeConfig = {
        [DocumentProcessingStatus.SUCCESSED]: {
            variant: 'default' as const,
            className: 'text-xs bg-green-500/10 text-green-600 hover:bg-green-500/20',
            content: t('documentProcessingStatus.successed'),
            icon: <CircleCheck className="h-3 w-3" />
        },
        [DocumentProcessingStatus.CONVERTING]: {
            variant: 'secondary' as const,
            className: 'text-xs flex items-center gap-1 bg-blue-500/10 text-blue-600',
            content: t('documentProcessingStatus.converting'),
            icon: <RotateCw className="h-3 w-3 animate-spin" />
        },
        [DocumentProcessingStatus.INDEXING]: {
            variant: 'secondary' as const,
            className: 'text-xs flex items-center gap-1 bg-blue-500/10 text-blue-600',
            content: t('documentProcessingStatus.indexing'),
            icon: <RotateCw className="h-3 w-3 animate-spin" />
        },
        [DocumentProcessingStatus.FAILED]: {
            variant: 'destructive' as const,
            className: 'text-xs hover:cursor-pointer flex items-center gap-1 bg-red-500/10 text-red-600 hover:bg-red-500/20',
            content: t('documentProcessingStatus.failed'),
            icon: <Play className="h-3 w-3" />
        },
        [DocumentProcessingStatus.UNPROCESSED]: {
            variant: 'outline' as const,
            className: 'text-xs hover:cursor-pointer flex items-center gap-1 bg-gray-500/10 text-gray-600 hover:bg-gray-500/20',
            content: t('convertToMarkdown'),
            icon: <Play className="h-3 w-3" />
        }
    };

    const config = badgeConfig[status];
    const isClickable = status === DocumentProcessingStatus.FAILED ||
        status === DocumentProcessingStatus.UNPROCESSED;

    return (
        <Badge
            variant={config.variant}
            className={config.className}
            onClick={isClickable ? handleClick : undefined}
        >
            {config.icon}
            {config.content}
        </Badge>
    );
} 