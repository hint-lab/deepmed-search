'use client';

import { useEffect, useState, useTransition, useMemo } from 'react';
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

const PUBLIC_MINIO_URL =
    process.env.NEXT_PUBLIC_MINIO_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_MINIO_URL ||
    'http://localhost:9000';

function toPublicMinioUrl(url?: string | null): string | undefined {
    if (!url) {
        return undefined;
    }

    if (!PUBLIC_MINIO_URL) {
        return url;
    }

    try {
        const original = new URL(url);
        const target = new URL(PUBLIC_MINIO_URL);

        original.protocol = target.protocol;
        original.host = target.host; // includes hostname + port

        return original.toString();
    } catch (error) {
        console.warn('[Chunks Preview] Failed to map MinIO URL', {
            url,
            PUBLIC_MINIO_URL,
            error,
        });
        return url;
    }
}

export default function ChunksPage() {
    const { id } = useParams();
    const { t } = useTranslate('chunks');
    const [loading, setLoading] = useState(true);
    const [document, setDocument] = useState<IDocument | null>(null);
    const [chunks, setChunks] = useState<IChunk[]>([]);
    const [markdownContent, setMarkdownContent] = useState<string | null>(null);
    const [loadingMarkdown, setLoadingMarkdown] = useState(false);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        const fetchChunks = async () => {
            if (!id || typeof id !== 'string') return;

            setLoading(true);
            try {
                const response = await getDocumentChunksAction(id);
                if (response.success && response.data) {
                    console.log('Fetched document data:', response.data.document);
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

    // 从 content_url 读取 markdown 内容
    useEffect(() => {
        const fetchMarkdown = async () => {
            if (!document?.content_url) {
                setMarkdownContent(null);
                return;
            }

            setLoadingMarkdown(true);
            try {
                const response = await fetch(document.content_url);
                if (response.ok) {
                    const text = await response.text();
                    setMarkdownContent(text);
                } else {
                    console.error('Failed to fetch markdown content:', response.statusText);
                    setMarkdownContent(null);
                }
            } catch (error) {
                console.error('Error fetching markdown content:', error);
                setMarkdownContent(null);
            } finally {
                setLoadingMarkdown(false);
            }
        };

        fetchMarkdown();
    }, [document?.content_url]);

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

    const fileUrl = useMemo(() => {
        const url = toPublicMinioUrl(document?.file_url);
        console.log('[ChunksPage] file_url processing:', {
            original: document?.file_url,
            processed: url,
            documentType: document?.type
        });
        return url;
    }, [document?.file_url, document?.type]);

    const renderPreview = () => {
        // Check if document exists first
        if (!document) {
            return <p className="text-center text-gray-500 p-10">{t('noDocumentData')}</p>;
        }

        // 1. 优先显示原始文件（如果有 file_url）
        if (fileUrl) {
            // PDF 文件使用 iframe 预览
            if (document.type === 'application/pdf') {
                return (
                    <iframe
                        src={fileUrl}
                        className="w-full h-full border-0"
                        title={document.name}
                    />
                );
            }
            
            // 图片文件直接显示
            if (document.type?.startsWith('image/')) {
                return (
                    <div className="w-full h-full flex items-center justify-center p-4">
                        <img 
                            src={fileUrl} 
                            alt={document.name}
                            className="max-w-full max-h-full object-contain"
                        />
                    </div>
                );
            }
            
            // 其他文件类型，提供下载链接
            return (
                <div className="w-full h-full flex flex-col items-center justify-center p-10">
                    <p className="text-center text-gray-500 mb-4">{t('previewNotSupported')}</p>
                    <a 
                        href={fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                    >
                        {t('downloadFile') || '下载文件'}
                    </a>
                </div>
            );
        }

        // 2. 如果没有 file_url，但有 content_url（markdown URL），显示 Markdown（作为后备）
        if (document.content_url) {
            if (loadingMarkdown) {
                return (
                    <div className="w-full h-full flex items-center justify-center">
                        <p className="text-gray-500">{t('loading') || '加载中...'}</p>
                    </div>
                );
            }
            if (markdownContent) {
                return (
                    <div className="w-full h-full p-4 overflow-auto prose dark:prose-invert max-w-none text-justify">
                        <ReactMarkdown>{markdownContent}</ReactMarkdown>
                    </div>
                );
            }
        }

        // 3. Fallback: No specific preview available
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-10">
                <p className="text-center text-gray-500 mb-2">{t('noPreview')}</p>
                <p className="text-xs text-gray-400">
                    file_url: {document.file_url || 'null'} | 
                    content_url: {document.content_url || 'null'}
                </p>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="container mx-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-2 h-full">
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
            <div className="flex flex-row gap-2 flex-grow overflow-hidden">
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