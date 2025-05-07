'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertTriangle, ArrowLeft, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PubMedArticle } from '@/lib/pubmed/types';
import { searchPubMedAction } from '@/actions/pubmed-search';
import { collectPubMedToKnowledgeBaseAction } from '@/actions/collect-pubmed';
import { getUserKnowledgeBasesAction } from '@/actions/knowledgebase';
import { toast } from 'sonner';

interface SimpleKnowledgeBase {
    id: string;
    name: string;
}

const PubMedResultItem = ({ pmid, title, authors, journal, pubdate, abstract }: PubMedArticle) => {
    const pubmedUrl = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
    const articleDetailUrl = `/search/pubmed/article/${pmid}`;
    const [showAbstract, setShowAbstract] = useState(false);

    const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
    const [knowledgeBases, setKnowledgeBases] = useState<SimpleKnowledgeBase[]>([]);
    const [selectedKbId, setSelectedKbId] = useState<string | undefined>(undefined);
    const [isFetchingKbs, setIsFetchingKbs] = useState(false);
    const [isCollectingToKb, setIsCollectingToKb] = useState(false);
    const [kbFetchError, setKbFetchError] = useState<string | null>(null);

    const handleOpenModal = async (isOpen: boolean) => {
        setIsCollectModalOpen(isOpen);
        if (isOpen && knowledgeBases.length === 0 && !isFetchingKbs) {
            setIsFetchingKbs(true);
            setKbFetchError(null);
            console.log("Fetching user knowledge bases...");
            try {
                const response = await getUserKnowledgeBasesAction();
                if (response.success && response.data) {
                    setKnowledgeBases(response.data);
                    console.log("Fetched KBs:", response.data);
                } else {
                    throw new Error(response.error || "无法加载知识库列表。");
                }
            } catch (error: any) {
                setKbFetchError(error.message || "加载知识库时出错。");
                toast.error("加载知识库列表失败", { description: error.message });
            } finally {
                setIsFetchingKbs(false);
            }
        }
        if (!isOpen) {
            setSelectedKbId(undefined);
        }
    };

    const handleConfirmCollect = async () => {
        if (!selectedKbId) {
            toast.warning("请选择一个知识库。", { id: 'kb-select-warn' });
            return;
        }
        setIsCollectingToKb(true);
        try {
            const articleData = {
                knowledgeBaseId: selectedKbId,
                pmid, title, authors, journal, pubdate, abstract, pubmedUrl
            };
            const dataToCollect = { ...articleData, abstract: abstract || undefined };

            console.log("Collecting to KB:", dataToCollect);
            const response = await collectPubMedToKnowledgeBaseAction(dataToCollect);

            if (response.success) {
                toast.success(`文章 "${title.substring(0, 30)}..." 已收藏!`, {
                    description: `文档 ID: ${response.data?.documentId}`,
                });
                handleOpenModal(false);
            } else {
                throw new Error(response.error || '收藏失败');
            }
        } catch (err: any) {
            console.error("Collection error:", err);
            toast.error(`收藏失败: ${err.message}`);
        } finally {
            setIsCollectingToKb(false);
        }
    };

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

    const displayAbstract = abstract || "摘要信息需要通过更新 searchPubMedAction 获取...";

    return (
        <div className="mb-7 break-inside-avoid border-b pb-4">
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                    <Link href={articleDetailUrl} className="text-sm text-green-700 dark:text-green-600 block mb-1 hover:underline break-words">
                        PMID: {pmid}
                    </Link>
                    <Link href={articleDetailUrl} className="block mb-1.5">
                        <h3 className="text-xl md:text-2xl text-blue-800 dark:text-blue-400 hover:underline font-medium break-words text-justify">
                            {title || 'No title available'}
                        </h3>
                    </Link>
                    <p className="text-sm text-gray-700 dark:text-gray-400 mb-1 break-words">
                        <strong>Authors:</strong> {authors || 'No authors listed'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-500 mb-3 break-words">
                        {journal || 'No journal listed'} ({pubdate || 'No publication date'})
                    </p>

                    <div className="mt-3">
                        <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-xs text-muted-foreground hover:text-primary"
                            onClick={() => setShowAbstract(!showAbstract)}
                            disabled={!abstract}
                        >
                            {showAbstract ? '隐藏摘要' : '显示摘要'}
                        </Button>
                        {showAbstract && (
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed prose prose-sm max-w-none break-words text-justify">
                                {displayAbstract}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex-shrink-0 mt-1">
                    <Dialog open={isCollectModalOpen} onOpenChange={handleOpenModal}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-[120px]">
                                <Library className="mr-1.5 h-4 w-4" />
                                收藏到库
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>收藏到知识库</DialogTitle>
                                <DialogDescription className="break-words">
                                    选择一个知识库来保存这篇文章: <br />
                                    <strong className="break-words">"{title}"</strong>
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="kb-select" className="text-right col-span-1">
                                        知识库
                                    </Label>
                                    <div className="col-span-3">
                                        {isFetchingKbs && <Loader2 className="h-4 w-4 animate-spin" />}
                                        {!isFetchingKbs && kbFetchError && <span className="text-xs text-destructive">{kbFetchError}</span>}
                                        {!isFetchingKbs && !kbFetchError && knowledgeBases.length === 0 && <span className="text-xs text-muted-foreground">没有可用的知识库。</span>}
                                        {!isFetchingKbs && !kbFetchError && knowledgeBases.length > 0 && (
                                            <Select value={selectedKbId} onValueChange={setSelectedKbId}>
                                                <SelectTrigger id="kb-select" className="w-full">
                                                    <SelectValue placeholder="请选择知识库..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {knowledgeBases.map(kb => (
                                                        <SelectItem key={kb.id} value={kb.id}>
                                                            {kb.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">取消</Button>
                                </DialogClose>
                                <Button
                                    type="button"
                                    onClick={handleConfirmCollect}
                                    disabled={isFetchingKbs || isCollectingToKb || !selectedKbId || knowledgeBases.length === 0}
                                >
                                    {isCollectingToKb ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    确认收藏
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
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
                const articlesWithAbstract = response.data.articles.map(a => ({ ...a, abstract: a.abstract || undefined }));
                setCurrentPageResults(articlesWithAbstract);
                if (pageToFetch === 1) {
                    setTotalCount(response.data.count);
                }
            } else {
                throw new Error(response.error || '搜索失败');
            }
        } catch (err: any) {
            console.error("PubMed search failed:", err);
            setError(err.message || 'Failed to fetch PubMed results.');
            setCurrentPageResults([]);
            if (pageToFetch === 1) setTotalCount(0);
        } finally {
            setIsLoading(false);
        }
    }, [decodedQuery, resultsPerPage]);

    useEffect(() => {
        setCurrentPage(1);
        setTotalCount(0);
        setCurrentPageResults([]);
        fetchResults(1);
    }, [decodedQuery, fetchResults]);

    const totalPages = useMemo(() => {
        if (totalCount <= 0) return 0;
        return Math.ceil(totalCount / resultsPerPage);
    }, [totalCount, resultsPerPage]);

    const handlePageChange = (newPage: number) => {
        if (newPage < 1 || newPage > totalPages || newPage === currentPage || isLoading) {
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
            <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    返回搜索
                </Button>
                {!isLoading && totalCount > 0 && (
                    <span className="text-sm text-muted-foreground text-right">
                        找到约 {totalCount} 条结果
                    </span>
                )}
            </div>

            <div className="mb-8 border-b pb-4">
                <p className="text-2xl break-words">{query || '...'}</p>
                <p className="text-sm text-muted-foreground mt-1">PubMed 搜索结果</p>
            </div>

            {isLoading && currentPage === 1 && (
                <div className="space-y-6">
                    <div className="flex justify-center items-center space-x-3 mb-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-lg text-muted-foreground">正在搜索 PubMed...</p>
                    </div>
                    {Array(resultsPerPage).fill(0).map((_, index) => (
                        <PubMedResultItemSkeleton key={`skel-${index}`} />
                    ))}
                </div>
            )}

            {isLoading && currentPage > 1 && (
                <div className="flex justify-center items-center space-x-3 my-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-md text-muted-foreground">正在加载第 {currentPage} 页...</p>
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
                <p className="text-center text-muted-foreground my-10 p-10">未能找到与 "{query}" 相关的任何 PubMed 文章。</p>
            )}

            <div className="space-y-6">
                {!isLoading && !error && currentPageResults.length > 0 && (
                    currentPageResults.map((article) => {
                        // Ensure all properties are strings
                        const safeArticle = {
                            pmid: String(article.pmid),
                            title: String(article.title || ''),
                            authors: String(article.authors || ''),
                            journal: String(article.journal || ''),
                            pubdate: String(article.pubdate || ''),
                            abstract: article.abstract ? String(article.abstract) : undefined
                        };
                        return (
                            <PubMedResultItem 
                                key={safeArticle.pmid} 
                                {...safeArticle}
                            />
                        );
                    })
                )}
            </div>

            {totalPages > 1 && (
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            )}
        </main>
    );
}
