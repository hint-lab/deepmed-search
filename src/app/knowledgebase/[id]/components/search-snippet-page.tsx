'use client';

import { useCallback, useMemo, useState, KeyboardEvent } from 'react';
import { useSession } from 'next-auth/react';
import { searchKnowledgeBaseSnippetsAction } from '@/actions/chunk';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, FileText, Eye, SlidersHorizontal } from 'lucide-react';
import { useTranslate } from '@/contexts/language-context';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';

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
    const { data: session } = useSession();
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<SnippetResult[]>([]);
    const [bm25Threshold, setBm25Threshold] = useState(20);
    const [vectorThreshold, setVectorThreshold] = useState(20);
    const [selectedSnippet, setSelectedSnippet] = useState<SnippetResult | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const terms = useMemo(
        () => query.trim().split(/\s+/).filter(Boolean),
        [query]
    );

    // 根据阈值过滤结果
    const filteredResults = useMemo(() => {
        return results.filter(result => {
            const bm25Pass = !result.bm25Similarity || (result.bm25Similarity * 100) >= bm25Threshold;
            const vectorPass = !result.vectorSimilarity || (result.vectorSimilarity * 100) >= vectorThreshold;
            return bm25Pass && vectorPass;
        });
    }, [results, bm25Threshold, vectorThreshold]);

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
            // 传递当前用户的 userId 以使用用户配置的 embedding 服务
            const userId = session?.user?.id;
            const response = await searchKnowledgeBaseSnippetsAction(kbId, trimmed, 20, userId);
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
    }, [kbId, query, t, session?.user?.id]);

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleSearch();
        }
    }, [handleSearch]);

    const handleViewSnippet = useCallback((snippet: SnippetResult) => {
        setSelectedSnippet(snippet);
        setIsDialogOpen(true);
    }, []);

    const headerLabel = filteredResults.length > 0
        ? `找到 ${filteredResults.length} 个片段${filteredResults.length !== results.length ? ` (共 ${results.length} 个，已过滤)` : ''}`
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

                <div className="flex flex-col gap-3">
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
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setShowFilters(!showFilters)}
                                className={showFilters ? 'bg-accent' : ''}
                            >
                                <SlidersHorizontal className="h-4 w-4" />
                            </Button>
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
                    </div>

                    {showFilters && (
                        <div className="rounded-lg border bg-muted/50 p-4 space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="bm25-threshold" className="text-sm font-medium">
                                        <span className="flex items-center gap-1.5">
                                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                                            BM25 最小阈值
                                        </span>
                                    </Label>
                                    <span className="text-sm font-medium text-muted-foreground">
                                        {bm25Threshold}%
                                    </span>
                                </div>
                                <Slider
                                    id="bm25-threshold"
                                    value={[bm25Threshold]}
                                    onValueChange={(value) => setBm25Threshold(value[0])}
                                    min={0}
                                    max={100}
                                    step={5}
                                    className="w-full"
                                />
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="vector-threshold" className="text-sm font-medium">
                                        <span className="flex items-center gap-1.5">
                                            <span className="h-2 w-2 rounded-full bg-green-500" />
                                            Vector 最小阈值
                                        </span>
                                    </Label>
                                    <span className="text-sm font-medium text-muted-foreground">
                                        {vectorThreshold}%
                                    </span>
                                </div>
                                <Slider
                                    id="vector-threshold"
                                    value={[vectorThreshold]}
                                    onValueChange={(value) => setVectorThreshold(value[0])}
                                    min={0}
                                    max={100}
                                    step={5}
                                    className="w-full"
                                />
                            </div>
                        </div>
                    )}
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
                        ) : filteredResults.length === 0 ? (
                            <div className="py-12 text-center text-sm text-muted-foreground">
                                {results.length > 0 
                                    ? '没有符合阈值条件的结果，请尝试降低过滤阈值' 
                                    : (error ? t('snippetSearch.errorFallback') : t('snippetSearch.empty'))
                                }
                            </div>
                        ) : (
                            filteredResults.map((result, index) => (
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
                                            onClick={() => handleViewSnippet(result)}
                                            className="self-start text-sm text-primary md:self-center"
                                        >
                                            <Eye className="mr-1.5 h-4 w-4" />
                                            查看片段
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

            {/* Dialog for viewing full snippet */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
                    <DialogHeader className="flex-shrink-0">
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            {selectedSnippet ? decodeFileName(selectedSnippet.docName) : '片段详情'}
                        </DialogTitle>
                        {selectedSnippet && (
                            <DialogDescription className="flex flex-wrap items-center gap-3 pt-2">
                                <span className="text-xs text-muted-foreground">
                                    更新时间: {formatDateTime(selectedSnippet.updatedAt)}
                                </span>
                                {typeof selectedSnippet.similarity === 'number' && (
                                    <Badge variant="outline" className="text-xs">
                                        综合相似度: {(selectedSnippet.similarity * 100).toFixed(1)}%
                                    </Badge>
                                )}
                                {typeof selectedSnippet.bm25Similarity === 'number' && (
                                    <Badge variant="outline" className="text-xs">
                                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-1.5" />
                                        BM25: {(selectedSnippet.bm25Similarity * 100).toFixed(1)}%
                                    </Badge>
                                )}
                                {typeof selectedSnippet.vectorSimilarity === 'number' && (
                                    <Badge variant="outline" className="text-xs">
                                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5" />
                                        Vector: {(selectedSnippet.vectorSimilarity * 100).toFixed(1)}%
                                    </Badge>
                                )}
                            </DialogDescription>
                        )}
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                        {selectedSnippet && (
                            <div className="space-y-4 py-2">
                                <div className="rounded-lg border bg-muted/30 p-4">
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">
                                        {highlightContent(selectedSnippet.content, terms)}
                                    </p>
                                </div>
                                <div className="flex justify-end pt-2 pb-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(`/chunks/${selectedSnippet.docId}`, '_blank')}
                                    >
                                        <FileText className="mr-1.5 h-4 w-4" />
                                        查看完整文档
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

