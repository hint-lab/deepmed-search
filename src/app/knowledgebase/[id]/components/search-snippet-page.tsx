'use client';

import { useCallback, useMemo, useState, KeyboardEvent } from 'react';
import Link from 'next/link';
import { searchKnowledgeBaseSnippetsAction } from '@/actions/chunk';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, FileText } from 'lucide-react';
import { useTranslate } from '@/contexts/language-context';

interface SnippetResult {
    id: string;
    chunkId: string;
    docId: string;
    docName: string;
    content: string;
    updatedAt: string;
    similarity?: number;
    bm25Similarity?: number;
    vectorSimilarity?: number;
}

interface SearchSnippetPageProps {
    kbId: string;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightContent = (text: string, terms: string[]): JSX.Element[] | string => {
    if (!terms.length) return text;
    const regex = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) => {
        const matched = terms.some(term => term.toLowerCase() === part.toLowerCase());
        return matched ? (
            <mark key={index} className="rounded-sm bg-yellow-200 px-1 py-0.5 text-yellow-900">
                {part}
            </mark>
        ) : (
            <span key={index}>{part}</span>
        );
    });
};

const formatDateTime = (value: string) => {
    try {
        return new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(new Date(value));
    } catch {
        return value;
    }
};

const decodeFileName = (fileName: string) => {
    try {
        // 移除 URL 参数（如 ?X-Amz-Algorithm=...）
        const nameWithoutParams = fileName.split('?')[0];
        // 解码 URL 编码的文件名
        return decodeURIComponent(nameWithoutParams);
    } catch {
        return fileName;
    }
};

export function SearchSnippetPage({ kbId }: SearchSnippetPageProps) {
    const { t } = useTranslate('knowledgeBase');
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<SnippetResult[]>([]);

    const terms = useMemo(
        () => query.trim().split(/\s+/).filter(Boolean),
        [query]
    );

    const handleSearch = useCallback(async () => {
        const trimmed = query.trim();
        if (!trimmed) {
            setError(t('snippetSearch.emptyKeyword'));
            setResults([]);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await searchKnowledgeBaseSnippetsAction(kbId, trimmed);
            if (response.success) {
                setResults(response.data || []);
            } else {
                setError(response.error || t('snippetSearch.unknownError'));
                setResults([]);
            }
        } catch (err) {
            console.error('Search snippet error:', err);
            setError(t('snippetSearch.unknownError'));
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, [kbId, query, t]);

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleSearch();
        }
    }, [handleSearch]);

    const headerLabel = results.length > 0
        ? t('snippetSearch.resultCount', { count: results.length })
        : loading
            ? t('snippetSearch.loading')
            : t('snippetSearch.empty');

    return (
        <div className="mb-5 space-y-8">
            <section className="space-y-4">
                <header className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                        {t('snippetSearch.description')}
                    </p>
                </header>

                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={t('snippetSearch.placeholder')}
                            className="pl-10"
                            autoFocus
                        />
                    </div>
                    <Button
                        onClick={handleSearch}
                        disabled={loading}
                        className="md:w-auto"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('snippetSearch.searching')}
                            </>
                        ) : (
                            <>
                                <Search className="mr-2 h-4 w-4" />
                                {t('snippetSearch.search')}
                            </>
                        )}
                    </Button>
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertDescription className="text-sm">{error}</AlertDescription>
                    </Alert>
                )}
            </section>

            <section className="space-y-4">
                <header className="text-sm text-muted-foreground">
                    <span className="font-medium">{headerLabel}</span>
                </header>

                <ScrollArea className="mb-10 max-h-[calc(100vh-360px)]">
                    <div className="space-y-4 pb-6">
                        {loading ? (
                            <div className="flex items-center justify-center px-6 py-12 text-sm text-muted-foreground">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('snippetSearch.loading')}
                            </div>
                        ) : results.length === 0 ? (
                            <div className="py-12 text-center text-sm text-muted-foreground">
                                {error ? t('snippetSearch.errorFallback') : t('snippetSearch.empty')}
                            </div>
                        ) : (
                            results.map((result, index) => (
                                <div
                                    key={result.id}
                                    className="rounded-lg border bg-background/60 p-4 pr-2 shadow-sm transition hover:border-primary/50"
                                >
                                    <div className="flex flex-col gap-3 md:flex-row md:justify-between">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                                                    #{index + 1}
                                                </Badge>
                                                <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                                    {decodeFileName(result.docName)}
                                                </span>
                                                {typeof result.similarity === 'number' && (
                                                    <Badge variant="outline" className="text-[11px] font-medium">
                                                        {(result.similarity * 100).toFixed(1)}%
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                                <span>
                                                    {t('snippetSearch.updatedAt', {
                                                        value: formatDateTime(result.updatedAt),
                                                    })}
                                                </span>
                                                {typeof result.bm25Similarity === 'number' && (
                                                    <span className="flex items-center gap-1">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                                        BM25 {(result.bm25Similarity * 100).toFixed(1)}%
                                                    </span>
                                                )}
                                                {typeof result.vectorSimilarity === 'number' && (
                                                    <span className="flex items-center gap-1">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                                        Vector {(result.vectorSimilarity * 100).toFixed(1)}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            asChild
                                            className="self-start text-sm text-primary md:self-center"
                                        >
                                            <Link href={`/chunks/${result.docId}`} target="_blank">
                                                {t('snippetSearch.linkDocument')}
                                            </Link>
                                        </Button>
                                    </div>
                                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                                        <span className="line-clamp-6 break-words whitespace-pre-wrap">
                                            {highlightContent(result.content, terms)}
                                        </span>
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </section>
        </div>
    );
}

