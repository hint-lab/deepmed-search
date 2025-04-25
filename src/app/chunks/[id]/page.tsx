'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams } from 'next/navigation';
import {
    Card, CardContent, CardHeader, CardTitle
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { IChunk } from '@/types/chunk';
import { IDocument } from '@/types/document';
import { getDocumentChunksAction, toggleChunkAvailabilityAction } from '@/actions/chunk';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslate } from '@/contexts/language-context';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

export default function ChunksPage() {
    const { id } = useParams();
    const { t } = useTranslate('chunks');
    const [loading, setLoading] = useState(true);
    const [document, setDocument] = useState<IDocument | null>(null);
    const [chunks, setChunks] = useState<IChunk[]>([]);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        const fetchChunks = async () => {
            if (!id || typeof id !== 'string') return;

            setLoading(true);
            try {
                const response = await getDocumentChunksAction(id);
                if (response.success && response.data) {
                    setDocument(response.data.document);
                    setChunks(response.data.chunks);
                }
            } catch (error) {
                console.error('获取文档分块失败:', error);
                toast.error(t('fetchError'));
            } finally {
                setLoading(false);
            }
        };

        fetchChunks();
    }, [id, t]);

    const handleAvailabilityChange = (chunkId: string, currentAvailability: number) => {
        const newAvailable = currentAvailability === 1 ? 0 : 1;
        const originalChunks = [...chunks];

        setChunks(prevChunks =>
            prevChunks.map(c =>
                c.id === chunkId ? { ...c, available_int: newAvailable } : c
            )
        );

        startTransition(async () => {
            const result = await toggleChunkAvailabilityAction(chunkId, newAvailable === 1);
            if (!result.success) {
                setChunks(originalChunks);
                toast.error(`${t('updateError')}: ${result.error}`);
            } else {
                toast.success(t('updateSuccess'));
            }
        });
    };

    const renderPreview = () => {
        if (!document?.file_url) {
            return <p className="text-center text-gray-500 p-10">{t('noPreview')}</p>;
        }

        if (document.type === 'application/pdf') {
            return (
                <iframe
                    src={document.file_url}
                    className="w-full h-full border-0"
                    title={document.name}
                />
            );
        }

        if (document.type === 'text/markdown' || document.name.endsWith('.md') || document.name.endsWith('.markdown')) {
            // Assuming document.content contains the markdown text or can be fetched
            return (
                <div className="w-full h-full p-4 overflow-auto">
                    <ReactMarkdown>{document.markdown_content}</ReactMarkdown>
                </div>
            );
        }

        return <p className="text-center text-gray-500 p-10">{t('previewNotSupported')}</p>;
    };

    if (loading) {
        return (
            <div className="container mx-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                <div className="flex flex-col h-full overflow-hidden">
                    <Skeleton className="h-10 w-3/4 mb-4 flex-shrink-0" />
                    <Skeleton className="h-6 w-1/2 mb-6 flex-shrink-0" />
                    <div className="space-y-4 overflow-y-auto flex-grow pr-4 -mr-4">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-24 w-full" />
                        ))}
                    </div>
                </div>
                <div className="h-full">
                    <Skeleton className="w-full h-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-8 flex flex-col h-full">
            <div className="flex mb-2 flex-shrink-0 mt-12 jusitfy-start items-center space-x-4">
                <h1 className="text-2xl font-bold mb-2 truncate">{document?.name}</h1>
                <p className="text-sm text-muted-foreground space-x-2">
                    {t('totalChunks')}: {chunks.length} <span> | </span>
                    {t('totalTokens')}: {document?.token_num || 0}
                </p>
            </div>

            {/* Use Flexbox for horizontal layout */}
            <div className="flex flex-row gap-8 flex-grow overflow-hidden">
                {/* Left Column: Chunks List - takes half width */}
                <div className="flex-1 flex flex-col h-full overflow-y-auto p-2 pr-4 border rounded-md">
                    <div className="space-y-3">
                        {chunks.length > 0 ? chunks.map((chunk, index) => (
                            <Card key={chunk.id} className="shadow-none border rounded-md overflow-hidden gap-2 py-1 bg-card">
                                <div className="flex items-center justify-between p-3 border-b">
                                    <CardTitle className="text-xs font-semibold text-muted-foreground">
                                        {t('chunk')} #{index + 1}
                                    </CardTitle>
                                    <Switch
                                        id={`switch-${chunk.id}`}
                                        checked={chunk.available_int === 1}
                                        onCheckedChange={() => handleAvailabilityChange(chunk.id, chunk.available_int)}
                                        disabled={isPending}
                                    />
                                </div>
                                <CardContent className="p-3">
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                        {chunk.content_with_weight}
                                    </p>
                                </CardContent>
                            </Card>
                        )) : (
                            <p className="text-center text-gray-500 pt-10">{t('noChunks')}</p>
                        )}
                    </div>
                </div>

                {/* Right Column: Document Preview - takes half width */}
                <Card className="flex-1 h-full overflow-hidden rounded-md py-0">
                    <CardContent className="p-0 h-full">
                        {renderPreview()}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 