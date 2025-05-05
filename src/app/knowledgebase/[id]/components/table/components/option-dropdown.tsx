import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { IDocument } from '@/types/document';
import { useTranslate } from '@/contexts/language-context';
import { Wrench, Pencil, MoreHorizontal, Trash2, CopyCheck } from 'lucide-react';
import { RenameDocumentButton } from './rename-document-dialog';
import { useState, useCallback } from 'react';
import { useDeleteDocument } from '@/hooks/use-document';
import { IDocumentProcessingStatus } from '@/types/enums';
import { toast } from 'sonner';

interface DocumentOptionsProps {
    document: IDocument;
    setCurrentRecord: (record: IDocument) => void;
    onRefresh: () => void;
    removeDocumentLocally: (documentId: string) => void;
}

export function DocumentOptionDropdownButton({
    document,
    setCurrentRecord,
    onRefresh,
    removeDocumentLocally
}: DocumentOptionsProps) {
    const { t } = useTranslate('knowledgeBase.options');
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const { deleteDocument, deleteLoading } = useDeleteDocument();
    const isProcessing = document.processing_status === IDocumentProcessingStatus.CONVERTING || document.processing_status === IDocumentProcessingStatus.INDEXING;

    const handleRenameClick = useCallback(() => {
        setRenameDialogOpen(true);
    }, []);

    const handleRenameSuccess = useCallback(() => {
        onRefresh();
    }, [onRefresh]);

    const handleDeleteClick = async () => {
        if (!document) return;
        try {
            await deleteDocument(document.id);
            toast.success(t('deleteSuccess', '文档已成功删除'));
            removeDocumentLocally(document.id);
        } catch (error: any) {
            console.error("Failed to delete document:", error);
            toast.error(t('deleteError', '删除文档失败'), {
                description: error.message
            });
        }
    };

    return (
        <>
            <section className="flex gap-2 items-center">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t('title')}</DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={() => navigator.clipboard.writeText(document.id)}
                            disabled={isProcessing}
                        >
                            <CopyCheck className="h-4 w-4" />{t('copyId')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => {
                                setCurrentRecord(document);
                            }}
                            disabled={isProcessing}
                        >
                            <Wrench className="h-4 w-4" />{t('changeChunkMethod')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={handleRenameClick}
                            disabled={isProcessing}
                        >
                            <Pencil className="h-4 w-4" />{t('rename')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            onClick={handleDeleteClick}
                            disabled={deleteLoading}
                        >
                            <Trash2 className="h-4 w-4" />{t('delete')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </section>

            <RenameDocumentButton
                open={renameDialogOpen}
                onOpenChange={setRenameDialogOpen}
                document={document}
                onSuccess={handleRenameSuccess}
            />
        </>
    );
} 