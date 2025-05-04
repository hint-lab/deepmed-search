'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PubMedArticle } from '@/lib/pubmed/types';
import { searchPubMedAction } from '@/actions/pubmed-search';

const PubMedResultItem = ({ pmid, title, authors, journal, pubdate }: PubMedArticle) => {
    const pubmedUrl = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;

    if (!pmid) {
        return (
            <div className="mb-7 break-inside-avoid border-b pb-4">
                <div className="flex items-center space-x-3 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    <p className="text-sm font-medium">无效文章数据</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mb-7 break-inside-avoid border-b pb-4">
            <a href={pubmedUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-green-700 dark:text-green-600 block mb-1 hover:underline break-words">
                PMID: {pmid}
            </a>
            <a href={pubmedUrl} target="_blank" rel="noopener noreferrer" className="block mb-1.5">
                <h3 className="text-xl md:text-2xl text-blue-800 dark:text-blue-400 hover:underline font-medium break-words">
                    {title || 'No title available'}
                </h3>
            </a>
            <p className="text-sm text-gray-700 dark:text-gray-400 mb-1">
                <strong>Authors:</strong> {authors || 'No authors listed'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-500">
                {journal || 'No journal listed'} ({pubdate || 'No publication date'})
            </p>
        </div>
    );
};

const PubMedResultItemSkeleton = () => {
    return (
        <div className="mb-7 break-inside-avoid border-b pb-4 animate-pulse">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-6 w-full bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
            <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded mb-2"></div>
            <div className="h-4 w-2/3 bg-gray-100 dark:bg-gray-800 rounded"></div>
        </div>
    );
};

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const PaginationControls = ({ currentPage, totalPages, onPageChange }: PaginationControlsProps) => {
    if (totalPages <= 1) return null;

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

export default function PubMedSearchResultsPage() {
    const params = useParams();
    const router = useRouter();
    const [currentPageResults, setCurrentPageResults] = useState<PubMedArticle[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const resultsPerPage = 10;

    const encodedQueryParam = params.query;
    const encodedQuery = Array.isArray(encodedQueryParam) ? encodedQueryParam[0] : encodedQueryParam;
    const decodedQuery = useMemo(() => decodeURIComponent(encodedQuery || ''), [encodedQuery]);

    const fetchResults = useCallback(async (pageToFetch: number) => {
        if (!decodedQuery.trim()) {
            setError('Search query cannot be empty.');
            setIsLoading(false);
            setCurrentPageResults([]);
            setTotalCount(0);
            return;
        }

        setIsLoading(true);
        setError(null);
        console.log(`Fetching PubMed results for: "${decodedQuery}", Page: ${pageToFetch}`);

        try {
            const response = await searchPubMedAction(decodedQuery, resultsPerPage, pageToFetch);

            if (response.success && response.data) {
                console.log(`Fetched ${response.data.articles.length} PubMed articles for page ${pageToFetch}. Total found: ${response.data.count}`);
                setCurrentPageResults(response.data.articles);
                if (totalCount === 0) {
                    setTotalCount(response.data.count);
                }
            } else {
                throw new Error(response.error || '搜索失败');
            }
        } catch (err: any) {
            console.error("PubMed search failed:", err);
            setError(err.message || 'Failed to fetch PubMed results.');
            setCurrentPageResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [decodedQuery, resultsPerPage, totalCount]);

    useEffect(() => {
        setCurrentPage(1);
        fetchResults(1);
    }, [decodedQuery, fetchResults]);

    const totalPages = useMemo(() => {
        if (totalCount <= 0) return 0;
        return Math.ceil(totalCount / resultsPerPage);
    }, [totalCount, resultsPerPage]);

    const handlePageChange = (newPage: number) => {
        if (newPage < 1 || newPage > totalPages || newPage === currentPage) {
            return;
        }
        console.log(`Changing page to: ${newPage}`);
        setCurrentPage(newPage);
        fetchResults(newPage);
        window.scrollTo(0, 0);
    };

    const query = decodedQuery;

    console.log('Rendering PubMedSearchResultsPage:', { isLoading, error, currentPageResultCount: currentPageResults.length, totalCount, currentPage, totalPages });

    return (
        <main className="container mx-auto max-w-5xl py-8 px-4 mt-16 min-h-screen">
            <div className="flex justify-between items-center mb-4">
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    返回搜索
                </Button>
                {!isLoading && totalCount > 0 && (
                    <span className="text-sm text-muted-foreground">
                        找到约 {totalCount} 条结果
                    </span>
                )}
            </div>

            <div className="mb-8 border-b pb-4">
                <p className="text-2xl break-words">{query || '...'}</p>
                <p className="text-sm text-muted-foreground mt-1">PubMed 搜索结果</p>
            </div>

            {isLoading && (
                <div className="space-y-6">
                    <div className="flex justify-center items-center space-x-3 mb-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-lg text-muted-foreground">正在搜索 PubMed (第 {currentPage} 页)...</p>
                    </div>
                    {Array(resultsPerPage).fill(0).map((_, index) => (
                        <PubMedResultItemSkeleton key={`skel-${index}`} />
                    ))}
                </div>
            )}

            {error && !isLoading && (
                <Card className="border-destructive bg-destructive/10 my-10">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0" />
                        <p className="text-sm text-destructive/90 font-medium">错误: {error}</p>
                    </CardContent>
                </Card>
            )}

            {!isLoading && !error && totalCount === 0 && currentPageResults.length === 0 && (
                <p className="text-center text-muted-foreground my-10 p-10">未能找到与"{query}"相关的任何 PubMed 文章。</p>
            )}

            {!isLoading && !error && currentPageResults.length > 0 && (
                <>
                    <div className="space-y-6">
                        {currentPageResults.map((article) => (
                            <PubMedResultItem key={article.pmid} {...article} />
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
