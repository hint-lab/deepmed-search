'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
// Import the SERVER ACTION, not the library function directly
import { performLlmSearchAction } from '@/actions/llm-search';
// Import the TYPE from the library, which is fine
import { SearchResult } from '@/lib/llm-search';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// Component to display a single LLM-generated search result item
// Note: Uses 'link' and 'snippet' from the SearchResult type in llm-search/types.ts
const LlmResultItem = ({ title, link, snippet, domain, position }: SearchResult) => (
    <div className="mb-7 break-inside-avoid">
        {/* Link URL */}
        <a href={link} target="_blank" rel="noopener noreferrer" title={link} className="text-sm text-green-700 dark:text-green-600 block mb-1 hover:underline break-words">
            {/* Display domain instead of full URL for cleaner look, maybe? Or keep URL */}
            {domain || new URL(link).hostname} {/* Show domain or extract hostname */}
        </a>
        {/* Title */}
        <a href={link} target="_blank" rel="noopener noreferrer" className="block mb-1.5">
            <h3 className="text-xl md:text-2xl text-blue-800 dark:text-blue-400 hover:underline font-medium break-words">
                {position}. {title} {/* Add position number */}
            </h3>
        </a>
        {/* Snippet - Render potentially highlighted HTML */}
        <p className="text-sm text-gray-700 dark:text-gray-400 line-clamp-3"
            dangerouslySetInnerHTML={{ __html: snippet }}>
            {/* Use dangerouslySetInnerHTML to render <b> tags from snippet */}
        </p>
    </div>
);

// --- Reusable Pagination Component ---
interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const PaginationControls = ({ currentPage, totalPages, onPageChange }: PaginationControlsProps) => {
    // Decide if pagination is needed based on total pages
    if (totalPages <= 1) {
        // Optionally return null or some indication that there's only one page
        // For LLM search, since we usually fetch a fixed number (e.g., 10),
        // client-side pagination might not be standard unless the LLM generates > resultsPerPage.
        // Let's return null for now if the simulator consistently returns <= resultsPerPage.
        return null;
    }

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
// --- End Pagination Component ---


export default function LlmSearchResultsPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    // State for all results returned by the simulator
    const [allResults, setAllResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [usageInfo, setUsageInfo] = useState<object | null>(null); // Optional: store token usage

    // --- Pagination State (Optional, depends on simulator behavior) ---
    const [currentPage, setCurrentPage] = useState(1);
    const resultsPerPage = 10; // Display 10 results per page client-side
    // --- End Pagination State ---


    const encodedQueryParam = params.query;
    const encodedQuery = Array.isArray(encodedQueryParam) ? encodedQueryParam[0] : encodedQueryParam;

    // Get model from URL search params for display purposes
    // We'll get it again inside useEffect to ensure it's the latest for the fetch logic
    const modelUsedForDisplay = searchParams.get('model') || '默认'; // Default text for display

    useEffect(() => {
        const decodedQuery = decodeURIComponent(encodedQuery || '');
        // Get model inside useEffect to pass to action
        const modelFromUrl = searchParams.get('model');

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
        setUsageInfo(null);
        setCurrentPage(1); // Reset page on new query

        const fetchLlmResults = async () => {
            console.log(`[LLM Page] Calling Action for: "${decodedQuery}" ${modelFromUrl ? `with model: ${modelFromUrl}` : ''}`);

            // Prepare optional parameters for the Action if needed
            // const actionParams = { num: 10 };

            try {
                // Pass modelId in an options object if it exists in the URL
                const response = await performLlmSearchAction(
                    decodedQuery,
                    modelFromUrl ? { model: modelFromUrl } : undefined
                );
                // --- Action returns { success: boolean, data?: Result[], error?: string } ---

                if (response.success && response.data) {
                    console.log(`[LLM Page] Received ${response.data.length} results from Action.`);
                    setAllResults(response.data);
                    // If action passes usage info:
                    // if (response.usage) setUsageInfo(response.usage);
                } else {
                    // Handle Action error
                    console.error("[LLM Page] Action failed:", response.error);
                    setError(response.error || 'Failed to generate LLM search results via Action.');
                    setAllResults([]);
                }
            } catch (err: any) {
                // Handle unexpected errors during the Action call itself
                console.error("[LLM Page] Error calling Server Action:", err);
                setError(err.message || 'An unexpected error occurred calling the search action.');
                setAllResults([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLlmResults();
    }, [encodedQuery, searchParams]); // Re-fetch when the query changes

    // --- Client-side Pagination Logic ---
    const { currentResults, totalPages } = useMemo(() => {
        const totalFetchedResults = allResults.length;
        // Calculate total pages based on the *fetched* results, not a theoretical max
        const pages = Math.ceil(totalFetchedResults / resultsPerPage);
        const startIndex = (currentPage - 1) * resultsPerPage;
        const endIndex = startIndex + resultsPerPage;
        const resultsSlice = allResults.slice(startIndex, endIndex);

        console.log('[LLM Page] Pagination Calculation:', { totalFetchedResults, currentPage, resultsPerPage, totalPages: pages });
        return { currentResults: resultsSlice, totalPages: pages };
    }, [allResults, currentPage, resultsPerPage]);

    const handlePageChange = (page: number) => {
        console.log(`[LLM Page] Changing page to: ${page}`);
        setCurrentPage(page);
        window.scrollTo(0, 0); // Scroll to top
    };
    // --- End Pagination Logic ---


    // Decode query for display after checks
    const query = decodeURIComponent(encodedQuery || '');

    return (
        <main className="container mx-auto max-w-5xl py-8 px-4 mt-16 min-h-screen">
            {/* Top Section: Back Button & Info */}
            <div className="flex justify-between items-center mb-4">
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    返回搜索
                </Button>
                {!isLoading && !error && allResults.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                        LLM 内省结果 (使用 {modelUsedForDisplay}, 约 {allResults.length} 条)
                    </span>
                )}
            </div>

            {/* Query Display */}
            <div className="mb-8 border-b pb-4">
                <p className="text-2xl break-words">{query}</p>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex justify-center items-center space-x-3 my-10 p-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-lg text-muted-foreground">正在使用 {modelUsedForDisplay} 模型思考中...</p>
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
                <p className="text-center text-muted-foreground my-10 p-10">未能生成与&quot;{query}&quot;相关的模拟搜索结果。</p>
            )}

            {/* Results List */}
            {!isLoading && !error && allResults.length > 0 && (
                <>
                    <div className="space-y-6">
                        {/* Use currentResults for pagination */}
                        {currentResults.map((result) => (
                            <LlmResultItem key={`${result.position}-${result.link}`} {...result} />
                        ))}
                    </div>
                    {/* Pagination Controls */}
                    <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                    {/* Optional: Display Token Usage */}
                    {usageInfo && (
                        <div className="text-xs text-muted-foreground text-center mt-4 border-t pt-4">
                            Token Usage: {JSON.stringify(usageInfo)}
                        </div>
                    )}
                </>
            )}
        </main>
    );
}
