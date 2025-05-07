'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { getPubMedSuggestionsAction } from '@/actions/pubmed-search';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface SearchSuggestionsProps {
    query: string;
    onSuggestionClick: (suggestion: string) => void;
    className?: string;
}

export function SearchSuggestions({ query, onSuggestionClick, className = '' }: SearchSuggestionsProps) {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const debouncedQuery = useDebounce(query, 2000); // 2秒防抖

    const fetchSuggestions = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setSuggestions([]);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await getPubMedSuggestionsAction(searchQuery);
            if (response.success && response.data) {
                setSuggestions(response.data);
            } else {
                throw new Error(response.error || '获取搜索建议失败');
            }
        } catch (err: any) {
            console.error('获取搜索建议失败:', err);
            setError(err.message);
            setSuggestions([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSuggestions(debouncedQuery);
    }, [debouncedQuery, fetchSuggestions]);

    if (!query.trim() || (!isLoading && suggestions.length === 0)) {
        return null;
    }

    return (
        <Card className={`absolute z-50 w-full mt-1 shadow-lg ${className}`}>
            <div className="p-2">
                {isLoading ? (
                    <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="ml-2 text-sm text-muted-foreground">正在获取建议...</span>
                    </div>
                ) : error ? (
                    <div className="p-2 text-sm text-destructive">{error}</div>
                ) : (
                    <ul className="space-y-1">
                        {suggestions.map((suggestion, index) => (
                            <li
                                key={index}
                                className="px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer transition-colors"
                                onClick={() => onSuggestionClick(suggestion)}
                            >
                                {suggestion}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Card>
    );
} 