'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { performWebSearch, SearchEngineType } from '@/actions/web-search';
import { StandardSearchResult } from '@/lib/search/common';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// Component to display a single search result item - Uses StandardSearchResult
const SearchResultItem = ({ title, url, description, source }: StandardSearchResult) => (
    <div className="mb-7 break-inside-avoid">
        {/* Link URL - Smaller font, allow wrap */}
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-green-700 dark:text-green-600 block mb-1 hover:underline break-words">
            {url}
        </a>
        {/* Title - Larger font, allow wrap */}
        <a href={url} target="_blank" rel="noopener noreferrer" className="block mb-1.5">
            <h3 className="text-xl md:text-2xl text-blue-800 dark:text-blue-400 hover:underline font-medium break-words">
                {title}
            </h3>
        </a>
        {/* Snippet - Adjusted color */}
        <p className="text-sm text-gray-700 dark:text-gray-400 line-clamp-3">
            {description}
        </p>
    </div>
);

// Pagination component
interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const PaginationControls = ({ currentPage, totalPages, onPageChange }: PaginationControlsProps) => {
    if (totalPages <= 1) return null; // Don't show controls if only one page

    return (
        <div className="flex justify-center items-center space-x-4 mt-10 mb-6">
            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
            >
                上一页
            </Button>
            <span className="text-sm text-muted-foreground">
                第 {currentPage} 页 / 共 {totalPages} 页
            </span>
            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
            >
                下一页
            </Button>
        </div>
    );
};

export default function WebSearchResultsPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [allResults, setAllResults] = useState<StandardSearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const resultsPerPage = 10;

    // Get query from path params
    const encodedQueryParam = params.query;
    const encodedQuery = Array.isArray(encodedQueryParam) ? encodedQueryParam[0] : encodedQueryParam;

    useEffect(() => {
        const decodedQuery = decodeURIComponent(encodedQuery || '');

        // --- Determine engine INSIDE useEffect ---
        const getEngineForEffect = (): SearchEngineType => {
            const engineFromUrl = searchParams.get('engine');
            if (engineFromUrl === 'tavily' || engineFromUrl === 'duckduckgo' || engineFromUrl === 'jina') {
                console.log(`[useEffect:getEngine] Engine found in URL: ${engineFromUrl}`);
                return engineFromUrl;
            }
            console.log(`[useEffect:getEngine] Engine not found/invalid (${engineFromUrl}), falling back.`);
            // Using 'tavily' as the final hardcoded default if env var is also missing
            return (process.env.NEXT_PUBLIC_DEFAULT_WEB_SEARCH_ENGINE as SearchEngineType) || 'tavily';
        };
        const engineToUse = getEngineForEffect();
        // --- End Determine engine ---

        if (!encodedQuery) {
            setError('Search query is missing from URL.');
            setIsLoading(false);
            return;
        }
        if (!decodedQuery.trim()) {
            setError('Search query cannot be empty.');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        setAllResults([]);
        setCurrentPage(1);

        const fetchResults = async () => {
            // Use the engine determined INSIDE the effect
            console.log(`Fetching web search results for: "${decodedQuery}" using engine: ${engineToUse}`);
            const response = await performWebSearch(decodedQuery, engineToUse); // Use engineToUse
            if (response.success && response.data) {
                console.log(`Fetched ${response.data.length} web search results using ${engineToUse}.`);
                setAllResults(response.data);
            } else {
                setError(response.error || `Failed to fetch web search results using ${engineToUse}.`);
                setAllResults([]);
            }
            setIsLoading(false);
        };
        fetchResults();
        // Dependencies: encodedQuery ensures fetch on query change,
        // searchParams ensures fetch if engine parameter changes.
    }, [encodedQuery, searchParams]);

    // Calculate pagination values using useMemo for efficiency
    const { currentResults, totalPages } = useMemo(() => {
        const totalFetchedResults = allResults.length;
        const pages = Math.ceil(totalFetchedResults / resultsPerPage);
        const startIndex = (currentPage - 1) * resultsPerPage;
        const endIndex = startIndex + resultsPerPage;
        const resultsSlice = allResults.slice(startIndex, endIndex);
        console.log('Pagination Calculation:', { totalFetchedResults, currentPage, resultsPerPage, totalPages: pages, startIndex, endIndex, currentResultsLength: resultsSlice.length });
        return { currentResults: resultsSlice, totalPages: pages };
    }, [allResults, currentPage, resultsPerPage]);

    const handlePageChange = (page: number) => {
        console.log(`Changing page to: ${page}`);
        setCurrentPage(page);
        window.scrollTo(0, 0);
    };

    // Decode query here for display purposes, AFTER useEffect has run
    const query = decodeURIComponent(encodedQuery || '');
    // Get engine again for display, now that searchParams should be stable
    const engineUsedForDisplay = searchParams.get('engine') as SearchEngineType || (process.env.NEXT_PUBLIC_DEFAULT_WEB_SEARCH_ENGINE as SearchEngineType) || 'tavily';

    console.log('Rendering WebSearchResultsPage:', { isLoading, error, totalResults: allResults.length, currentPage, totalPages, engineUsed: engineUsedForDisplay });

    return (
        <main className="container mx-auto max-w-5xl py-8 px-4 mt-16 min-h-screen">
            {/* Top section with back button and search info */}
            <div className="flex justify-between items-center mb-4">
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    返回搜索
                </Button>
                {/* Display results count if not loading and no error */}
                {!isLoading && !error && allResults.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                        找到约 {allResults.length} 条结果 (使用 {engineUsedForDisplay})
                    </span>
                )}
            </div>

            {/* Search query display */}
            <div className="mb-8 border-b pb-4">
                <p className="text-2xl break-words">{query}</p>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex justify-center items-center space-x-3 my-10 p-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-lg text-muted-foreground">正在使用 {searchParams.get('engine') || '默认引擎'} 搜索网页...</p>
                </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
                <Card className="border-destructive bg-destructive/10 my-10">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0" />
                        <p className="text-sm text-destructive/90 font-medium">错误: {error}</p>
                    </CardContent>
                </Card>
            )}

            {/* No Results State */}
            {!isLoading && !error && allResults.length === 0 && (
                <p className="text-center text-muted-foreground my-10 p-10">未能找到与"{query}"相关的任何网页结果。</p>
            )}

            {/* Results List and Pagination */}
            {!isLoading && !error && allResults.length > 0 && (
                <>
                    <div className="space-y-6">
                        {currentResults.map((result, index) => (
                            <SearchResultItem key={result.url + index} {...result} />
                        ))}
                    </div>
                    <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                </>
            )}
        </main>
    );
}
