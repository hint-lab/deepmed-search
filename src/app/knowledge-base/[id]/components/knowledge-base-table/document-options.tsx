import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { IDocumentInfo } from '@/types/db/document';
import { useTranslate } from '@/hooks/use-language';
import { Wrench, Pencil, MoreHorizontal, Trash2, CopyCheck } from 'lucide-react';
import { RenameDocumentDialog } from './rename-document-dialog';
import { useState, useCallback } from 'react';
import { useDeleteDocument } from '@/hooks/use-document';

interface DocumentOptionsProps {
    document: IDocumentInfo;
    onShowChangeParserModal: (document: IDocumentInfo) => void;
    onProcessChunks: (document: IDocumentInfo) => void;
    setCurrentRecord: (record: IDocumentInfo) => void;
    showChangeParserModal: () => void;
}

export function DocumentOptions({
    document,
    onShowChangeParserModal,
    onProcessChunks,
    setCurrentRecord,
    showChangeParserModal,
}: DocumentOptionsProps) {
    const { t } = useTranslate('knowledgeBase');
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const { deleteDocument } = useDeleteDocument();
    const isProcessing = document.processing_status === 'processing';
    const canProcessChunks = document.processing_status === 'completed' && document.chunk_num === 0;

    const handleRenameClick = useCallback(() => {
        setRenameDialogOpen(true);
    }, []);

    const handleRenameSuccess = useCallback(() => {
    }, []);

    return (
        <>
            <section className="flex gap-2 items-center">
                <Switch
                    id={`status-${document.id}`}
                    className="scale-75"
                    checked={document.status === 'enabled'}
                    disabled={isProcessing}
                />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            disabled={isProcessing}
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
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
                                showChangeParserModal();
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
                        {canProcessChunks && (
                            <DropdownMenuItem
                                onClick={() => onProcessChunks(document)}
                            >
                                {t('processChunks')}
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            disabled={isProcessing}
                            onClick={() => deleteDocument(document.id)}
                        >
                            <Trash2 className="h-4 w-4" />{t('delete')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </section>

            <RenameDocumentDialog
                open={renameDialogOpen}
                onOpenChange={setRenameDialogOpen}
                document={document}
                onSuccess={handleRenameSuccess}
            />
        </>
    );
} 