'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTranslate } from '@/contexts/language-context';
import { useSelectParserList, ParserItem } from '@/hooks/use-user-setting';
import { useState } from 'react';

interface ChunkMethodDialogProps {
    documentId: string;
    parserId: string;
    parserConfig: any;
    documentExtension: string;
    onOk: (config: any) => void;
    visible: boolean;
    hideModal: () => void;
    loading: boolean;
}

export function ChunkMethodDialog({
    documentId,
    parserId,
    parserConfig,
    documentExtension,
    onOk,
    visible,
    hideModal,
    loading,
}: ChunkMethodDialogProps) {
    const { t } = useTranslate('knowledgeBase');
    const parserList = useSelectParserList();
    const [selectedParser, setSelectedParser] = useState(parserId);
    const [chunkSize, setChunkSize] = useState(parserConfig?.chunk_size || 500);
    const [overlap, setOverlap] = useState(parserConfig?.overlap || 50);

    const handleOk = () => {
        onOk({
            parserId: selectedParser,
            parserConfig: {
                chunk_size: chunkSize,
                overlap: overlap,
            },
        });
    };

    return (
        <Dialog open={visible} onOpenChange={hideModal}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('changeChunkMethod')}</DialogTitle>
                    <DialogDescription>
                        {t('docParser.methodExamplesDescription')}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="parser" className="text-right">
                            {t('chunkMethod')}
                        </Label>
                        <Select
                            value={selectedParser}
                            onValueChange={setSelectedParser}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder={t('selectChunkMethod')} />
                            </SelectTrigger>
                            <SelectContent>
                                {parserList.map((item: ParserItem) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="chunkSize" className="text-right">
                            {t('form.chunkSize')}
                        </Label>
                        <Input
                            id="chunkSize"
                            type="number"
                            value={chunkSize}
                            onChange={(e) => setChunkSize(Number(e.target.value))}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="overlap" className="text-right">
                            {t('form.chunkOverlap')}
                        </Label>
                        <Input
                            id="overlap"
                            type="number"
                            value={overlap}
                            onChange={(e) => setOverlap(Number(e.target.value))}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={hideModal}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={handleOk} disabled={loading}>
                        {loading ? t('processing') : t('common.ok')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 