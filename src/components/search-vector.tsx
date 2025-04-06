'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Search } from 'lucide-react';
import { useTranslate } from '@/hooks/use-language';

interface SearchResult {
    id: string;
    content: string;
    score: number;
    metadata: any;
}

export function VectorSearch() {
    const { t } = useTranslate('search');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) return;

        setIsSearching(true);
        try {
            // 调用向量搜索 API
            const response = await fetch('/api/search/vector', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query,
                    limit: 5,
                    collection: 'medical_documents'
                }),
            });

            if (!response.ok) {
                throw new Error(`搜索失败: ${response.statusText}`);
            }

            const data = await response.json();
            setResults(data.results || []);
        } catch (error) {
            console.error('向量搜索错误:', error);
            // 可以在此添加错误提示
        } finally {
            setIsSearching(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto">
            <div className="flex items-center space-x-2 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('searchPlaceholder', '搜索医疗知识库...')}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="pl-10"
                    />
                </div>
                <Button
                    onClick={handleSearch}
                    disabled={isSearching || !query.trim()}
                >
                    {isSearching ? (
                        <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    ) : null}
                    {t('search', '搜索')}
                </Button>
            </div>

            {results.length > 0 ? (
                <div className="space-y-4">
                    {results.map((result) => (
                        <Card key={result.id}>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    {result.metadata?.title || t('resultTitle', '搜索结果')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{result.content}</p>
                            </CardContent>
                            <CardFooter className="text-xs text-muted-foreground">
                                <span className="mr-2">
                                    {t('relevance', '相关度')}: {Math.round(result.score * 100)}%
                                </span>
                                {result.metadata?.source && (
                                    <span>{t('source', '来源')}: {result.metadata.source}</span>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : query && !isSearching ? (
                <p className="text-center text-muted-foreground py-8">
                    {t('noResults', '没有找到相关结果')}
                </p>
            ) : null}
        </div>
    );
} 