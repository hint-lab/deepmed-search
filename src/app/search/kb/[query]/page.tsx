'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
// Import the KB search action and result type
import { performKbSearchAction, ChunkResult } from '@/actions/kb-search';
import { Loader2, AlertTriangle, ArrowLeft, FileText, DatabaseZap, Search, X } from 'lucide-react'; // Added FileText, DatabaseZap, Search, X
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge"; // Import Badge 
import { useKnowledgeBaseContext } from '@/contexts/knowledgebase-context';
import { Skeleton } from "@/components/ui/skeleton";
// Import Dialog components
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";

// Updated helper function to extract filename and remove query parameters
const getDisplayFilename = (source: string | undefined): string => {
    if (!source) return '未知来源';

    let filenamePart = source; // Start with the full source

    try {
        // First, try parsing as a URL - the pathname won't include query params
        const url = new URL(source);
        const pathname = url.pathname;
        filenamePart = pathname.substring(pathname.lastIndexOf('/') + 1);
    } catch (e) {
        // If not a valid URL, treat as a string path/filename
        // Get the part after the last '/'
        filenamePart = source.substring(source.lastIndexOf('/') + 1);
    }

    // Now, check the extracted part for a '?' and remove query params if present
    const queryIndex = filenamePart.indexOf('?');
    if (queryIndex !== -1) {
        filenamePart = filenamePart.substring(0, queryIndex);
    }

    // Finally, decode any URI components
    try {
        return decodeURIComponent(filenamePart);
    } catch (decodeError) {
        // If decoding fails (e.g., invalid encoding), return the part as is
        console.warn(`Failed to decode filename part: ${filenamePart}`, decodeError);
        return filenamePart;
    }
};

// --- Updated Component to display a single KB Chunk item (Search Result Style) ---
interface KbChunkItemProps extends ChunkResult {
    onClick: (chunk: ChunkResult) => void;
}

const KbChunkItem = ({ id, text, score, source, metadata, onClick, ...rest }: KbChunkItemProps) => {
    const displaySource = getDisplayFilename(source);
    const chunkData = { id, text, score, source, metadata, ...rest }; // Capture all chunk data

    return (
        // Wrap in a button or make div clickable for semantics
        <button
            key={id}
            className="mb-7 text-left w-full p-3 rounded-md hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors duration-150"
            onClick={() => onClick(chunkData)} // Pass the full chunk data
        >
            <div className="flex items-center space-x-2 text-sm text-green-700 dark:text-green-600 mb-1">
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span className="truncate" title={displaySource}>{displaySource}</span>
                {metadata?.page && <span className="text-xs text-muted-foreground flex-shrink-0">(页 {metadata.page})</span>}
                {/* Clearer Score Badge */}
                <Badge
                    variant="secondary" // Use secondary variant for subtle background
                    className="ml-auto text-xs px-2 py-0.5 font-medium" // Removed border-transparent, kept font-medium
                >
                    {/* Assuming lower score (distance) is better, uncomment prefix if needed */}
                    {/* 距离: {score.toFixed(3)} */}
                    分数: {score.toFixed(3)}
                </Badge>
            </div>
            <p className="text-sm text-foreground/90 line-clamp-3 leading-relaxed">
                {text}
            </p>
        </button>
    );
};

// --- Updated Skeleton Loader Component ---
const KbChunkSkeleton = () => (
    <div className="mb-7 p-3">
        {/* Skeleton for Source/URL line */}
        <div className="flex items-center space-x-2 mb-2">
            <Skeleton className="h-4 w-4 flex-shrink-0" />
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-5 w-14 ml-auto rounded-md" />
        </div>
        {/* Skeleton for Text Snippet with varying widths */}
        <div className="space-y-2 mt-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
        </div>
    </div>
);

// --- Reusable Pagination Component (copied from llm page, no changes needed) ---
interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const PaginationControls = ({ currentPage, totalPages, onPageChange }: PaginationControlsProps) => {
    if (totalPages <= 1) return null;
    return (
        <div className="flex justify-center items-center space-x-4 mt-10 mb-6">
            <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>上一页</Button>
            <span className="text-sm text-muted-foreground">第 {currentPage} 页 / 共 {totalPages} 页</span>
            <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>下一页</Button>
        </div>
    );
};
// --- End Pagination Component ---

export default function KbSearchResultsPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams(); // Get search params
    const [allResults, setAllResults] = useState<ChunkResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const resultsPerPage = 10; // Adjusted to 10 for single column layout

    const encodedQueryParam = params.query;
    const encodedQuery = Array.isArray(encodedQueryParam) ? encodedQueryParam[0] : encodedQueryParam;
    const kbId = searchParams.get('kbId'); // Read kbId from URL
    const {
        currentKnowledgeBase,
        setCurrentKnowledgeBaseId,
        isLoadingCurrent: isLoadingKbDetails
    } = useKnowledgeBaseContext();

    // --- Modal State ---
    const [selectedChunk, setSelectedChunk] = useState<ChunkResult | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    // --- End Modal State ---

    const [kbSearchMode, setKbSearchMode] = useState<'vector' | 'bm25' | 'hybrid'>('vector');

    useEffect(() => {
        const decodedQuery = decodeURIComponent(encodedQuery || '');

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
        // Check if kbId is present
        if (!kbId) {
            setError('Knowledge base ID is missing from URL.');
            setIsLoading(false);
            return;
        }

        // Set the current KB ID in the context to fetch details
        setCurrentKnowledgeBaseId(kbId);

        setIsLoading(true);
        setError(null);
        setAllResults([]);
        setCurrentPage(1);

        const fetchKbResults = async () => {
            console.log(`[KB Page] Calling Action for query: "${decodedQuery}" in KB ID: ${kbId}`);
            try {
                // Pass kbId to the action
                const response = await performKbSearchAction(decodedQuery, { topK: 50, kbId: kbId, mode: kbSearchMode });

                if (response.success && response.data) {
                    console.log(`[KB Page] Received ${response.data.length} chunk results from Action.`);
                    // --- Sort results by score (assuming score is distance, lower is better) ---
                    const sortedResults = response.data.sort((a, b) => a.score - b.score);
                    // --- End Sorting ---
                    setAllResults(sortedResults); // Set the sorted results
                } else {
                    console.error("[KB Page] Action failed:", response.error);
                    setError(response.error || 'Failed to fetch knowledge base results via Action.');
                    setAllResults([]);
                }
            } catch (err: any) {
                console.error("[KB Page] Error calling KB Server Action:", err);
                setError(err.message || 'An unexpected error occurred calling the KB search action.');
                setAllResults([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchKbResults();
        // Add kbId to dependency array - fetch again if kbId changes (though unlikely on this page)
    }, [encodedQuery, kbId, setCurrentKnowledgeBaseId, kbSearchMode]);

    // --- Client-side Pagination Logic ---
    const { currentResults, totalPages } = useMemo(() => {
        const totalFetchedResults = allResults.length;
        const pages = Math.ceil(totalFetchedResults / resultsPerPage);
        const startIndex = (currentPage - 1) * resultsPerPage;
        const endIndex = startIndex + resultsPerPage;
        const resultsSlice = allResults.slice(startIndex, endIndex);

        console.log('[KB Page] Pagination Calculation:', { totalFetchedResults, currentPage, resultsPerPage, totalPages: pages });
        return { currentResults: resultsSlice, totalPages: pages };
    }, [allResults, currentPage, resultsPerPage]);

    const handlePageChange = (page: number) => {
        console.log(`[KB Page] Changing page to: ${page}`);
        setCurrentPage(page);
        window.scrollTo(0, 0); // Scroll to top
    };
    // --- End Pagination Logic ---

    // --- Modal Handlers ---
    const handleChunkClick = useCallback((chunk: ChunkResult) => {
        setSelectedChunk(chunk);
        setIsModalOpen(true);
        console.log("Opening modal for chunk:", chunk.id);
    }, []);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setSelectedChunk(null); // Clear selected chunk when closing
        console.log("Closing modal");
    }, []);
    // --- End Modal Handlers ---

    const query = decodeURIComponent(encodedQuery || '');
    // You might want to display the name of the KB being searched
    // This would require fetching the KB details based on kbId or getting it from context
    const kbDisplayName = useMemo(() => {
        if (isLoadingKbDetails) {
            return `知识库 (加载中...)`;
        }
        if (currentKnowledgeBase && currentKnowledgeBase.id === kbId) {
            return currentKnowledgeBase.name || `知识库 (${kbId})`; // Use name if available
        }
        if (kbId) {
            return `知识库 (${kbId})`; // Fallback if details not loaded yet or ID mismatch
        }
        return '知识库'; // Default if kbId is missing
    }, [kbId, currentKnowledgeBase, isLoadingKbDetails]);

    return (
        <div className="container mx-auto max-w-5xl py-8 px-4 mt-16 min-h-screen">
            {/* Top Section: Back Button & Info */}
            <div className="flex justify-between items-center mb-5">
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    返回搜索
                </Button>
                {!isLoading && !error && allResults.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                        在 "{kbDisplayName}" 中找到约 {allResults.length} 个相关结果
                    </span>
                )}
            </div>

            {/* Query Display */}
            <div className="mb-8 border-b pb-4">
                <div className="flex items-center space-x-2">
                    <Search className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                    <p className="text-2xl font-medium break-words">{query}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1.5 ml-8">在 "{kbDisplayName}" 中的搜索结果</p>
            </div>

            {/* Loading State with Skeleton */}
            {isLoading && (
                <div className="space-y-8 pt-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                        <KbChunkSkeleton key={index} />
                    ))}
                </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
                <Card className="border-destructive bg-destructive/10 my-10">
                    <CardContent className="p-6 flex items-center space-x-3">
                        <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0" />
                        <p className="text-base text-destructive/90 font-medium">错误: {error}</p>
                    </CardContent>
                </Card>
            )}

            {/* No Results State */}
            {!isLoading && !error && allResults.length === 0 && (
                <div className="text-center text-muted-foreground my-12 p-10 border border-dashed rounded-lg">
                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">无结果</p>
                    <p className="mt-1">在 "{kbDisplayName}" 中未能找到与"{query}"相关的文本块。</p>
                </div>
            )}

            {/* Results List - Single Column */}
            {!isLoading && !error && allResults.length > 0 && (
                <>
                    <div className="space-y-1">
                        {currentResults.map((chunk) => (
                            <KbChunkItem
                                key={chunk.id}
                                {...chunk}
                                onClick={handleChunkClick}
                            />
                        ))}
                    </div>
                    <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                </>
            )}

            {/* --- Modal Dialog --- */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[650px] max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>文本块详情</DialogTitle>
                        {selectedChunk?.source && (
                            <DialogDescription>
                                来源: {getDisplayFilename(selectedChunk.source)}
                                {selectedChunk.metadata?.page && ` (页 ${selectedChunk.metadata.page})`}
                            </DialogDescription>
                        )}
                    </DialogHeader>
                    {/* Scrollable content area */}
                    <div className="flex-grow overflow-y-auto pr-4 -mr-4 py-4 text-sm">
                        {selectedChunk?.text ? (
                            <p className="whitespace-pre-wrap leading-relaxed">
                                {selectedChunk.text}
                            </p>
                        ) : (
                            <p className="text-muted-foreground">无法加载内容。</p>
                        )}
                    </div>
                    {/* Fixed footer area */}
                    <DialogFooter className="sm:justify-start pt-4 border-t mt-auto">
                        {/* Display Chunk ID and Score */}
                        <div className="text-xs text-muted-foreground space-x-4">
                            <span>ID: <code className="bg-muted px-1 py-0.5 rounded">{selectedChunk?.id}</code></span>
                            <span>分数: <code className="bg-muted px-1 py-0.5 rounded">{selectedChunk?.score?.toFixed(4)}</code></span>
                        </div>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary" className="ml-auto">
                                关闭
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
