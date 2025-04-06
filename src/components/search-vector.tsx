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
        <div className="w-full max-w-3xl mx-auto bg-card/50 rounded-xl p-6 shadow-sm">
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
                        <Card key={result.id} className="hover:shadow-md transition-shadow duration-200">
                            <CardHeader className="py-3 px-4 bg-muted/30">
                                <CardTitle className="text-base flex items-center">
                                    {result.metadata?.title || t('resultTitle', '搜索结果')}
                                    {result.metadata?.category && (
                                        <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                            {result.metadata.category}
                                        </span>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="py-3 px-4">
                                <p className="text-sm text-muted-foreground">{result.content}</p>
                            </CardContent>
                            <CardFooter className="text-xs py-2 px-4 border-t bg-muted/10 flex justify-between">
                                <div className="flex items-center">
                                    <span className="flex items-center">
                                        <span className="h-2 w-2 rounded-full bg-primary/60 mr-1.5"></span>
                                        {t('relevance', '相关度')}: {Math.round(result.score * 100)}%
                                    </span>
                                </div>
                                {result.metadata?.source && (
                                    <span>{t('source', '来源')}: {result.metadata.source}</span>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : query && !isSearching ? (
                <div className="text-center py-10 bg-muted/20 rounded-lg">
                    <Search className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm mb-2">
                        {t('noResults', '没有找到相关结果')}
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                        {t('tryDifferent', '请尝试不同的搜索词或更准确的描述')}
                    </p>
                </div>
            ) : !query ? (
                <div className="text-center py-8">
                    <Search className="h-8 w-8 text-primary/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                        {t('initialPrompt', '输入关键词开始搜索医疗知识')}
                    </p>
                </div>
            ) : null}
        </div>
    );
} 