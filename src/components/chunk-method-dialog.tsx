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
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation('translation', { keyPrefix: 'dataset' });
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
                    <DialogTitle>修改分块方法</DialogTitle>
                    <DialogDescription>
                        选择合适的分块方法来处理您的文档
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="parser" className="text-right">
                            分块方法
                        </Label>
                        <Select
                            value={selectedParser}
                            onValueChange={setSelectedParser}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="选择分块方法" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="text">文本分块</SelectItem>
                                <SelectItem value="markdown">Markdown分块</SelectItem>
                                <SelectItem value="pdf">PDF分块</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="chunkSize" className="text-right">
                            分块大小
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
                            重叠大小
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
                        取消
                    </Button>
                    <Button onClick={handleOk} disabled={loading}>
                        {loading ? '处理中...' : '确定'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 