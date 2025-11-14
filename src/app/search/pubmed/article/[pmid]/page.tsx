'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPubMedArticleDetails } from '@/lib/pubmed/api';
import { PubMedArticle } from '@/lib/pubmed/types';
import { Loader2, AlertTriangle, ArrowLeft, Library, ExternalLink } from 'lucide-react'; // Added icons
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
import { collectPubMedToKnowledgeBaseAction } from '@/actions/collect-pubmed';
import { getUserKnowledgeBasesAction } from '@/actions/knowledgebase';
import { toast } from 'sonner';

// Define KB type for state
interface SimpleKnowledgeBase {
    id: string;
    name: string;
}

// Reusable Collect Button Logic (as a separate component for clarity)
function CollectPubMedButton({ article }: { article: PubMedArticle }) {
    const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
    const [knowledgeBases, setKnowledgeBases] = useState<SimpleKnowledgeBase[]>([]);
    const [selectedKbId, setSelectedKbId] = useState<string | undefined>(undefined);
    const [isFetchingKbs, setIsFetchingKbs] = useState(false);
    const [isCollectingToKb, setIsCollectingToKb] = useState(false);
    const [kbFetchError, setKbFetchError] = useState<string | null>(null);
    const pubmedUrl = `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`;

    const handleOpenModal = async (isOpen: boolean) => {
        setIsCollectModalOpen(isOpen);
        if (isOpen && knowledgeBases.length === 0 && !isFetchingKbs) {
            setIsFetchingKbs(true);
            setKbFetchError(null);
            try {
                const response = await getUserKnowledgeBasesAction();
                if (response.success && response.data) {
                    setKnowledgeBases(response.data);
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
        if (!isOpen) setSelectedKbId(undefined);
    };

    const handleConfirmCollect = async () => {
        if (!selectedKbId) {
            toast.warning("请选择一个知识库。", { id: 'kb-select-warn-detail' });
            return;
        }
        setIsCollectingToKb(true);
        try {
            // Prepare data for the backend action.
            // Backend will now format this data into Markdown.
            const dataToCollect = {
                knowledgeBaseId: selectedKbId,
                pmid: article.pmid,
                title: article.title,
                authors: article.authors, // Pass authors
                journal: article.journal, // Pass journal
                pubdate: article.pubdate, // Pass publication date
                abstract: article.abstract || undefined, // Pass abstract (optional)
                pubmedUrl: pubmedUrl, // Pass the pubmed URL
                pmcid: article.pmcid || undefined, // Pass PMCID if available
                doi: article.doi || undefined // Pass DOI if available
            };
            console.log("[Collect KB Frontend] Sending data to action:", dataToCollect);
            const response = await collectPubMedToKnowledgeBaseAction(dataToCollect);
            if (response.success) {
                toast.success(`文章 "${article.title.substring(0, 30)}..." 已收藏!`, {
                    description: `文档 ID: ${response.data?.documentId}`,
                    id: `collect-success-${response.data?.documentId}`
                });
                handleOpenModal(false);
            } else {
                throw new Error(response.error || '收藏文章失败');
            }
        } catch (err: any) {
            console.error("[Collect KB Frontend] Error collecting:", err);
            toast.error(`收藏失败: ${err.message}`, { id: 'collect-error' });
        } finally {
            setIsCollectingToKb(false);
        }
    };

    return (
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
                        <strong className="break-words">{article.title}</strong>
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="kb-select-detail" className="text-right col-span-1">
                            知识库
                        </Label>
                        <div className="col-span-3">
                            {isFetchingKbs && <Loader2 className="h-4 w-4 animate-spin" />}
                            {!isFetchingKbs && kbFetchError && <span className="text-xs text-destructive">{kbFetchError}</span>}
                            {!isFetchingKbs && !kbFetchError && knowledgeBases.length === 0 && <span className="text-xs text-muted-foreground">没有可用的知识库。</span>}
                            {!isFetchingKbs && !kbFetchError && knowledgeBases.length > 0 && (
                                <Select value={selectedKbId} onValueChange={setSelectedKbId}>
                                    <SelectTrigger id="kb-select-detail" className="w-full">
                                        <SelectValue placeholder="请选择知识库..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {knowledgeBases.map(kb => (
                                            <SelectItem key={kb.id} value={kb.id}>{kb.name}</SelectItem>
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
    );
}


export default function PubMedArticlePage() {
    const params = useParams();
    const router = useRouter();
    const [article, setArticle] = useState<PubMedArticle | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const pmid = Array.isArray(params.pmid) ? params.pmid[0] : params.pmid;

    useEffect(() => {
        if (!pmid) {
            setError("无效的文章ID。");
            setIsLoading(false);
            return;
        }

        let isMounted = true; // Flag to prevent state update on unmounted component
        const fetchDetails = async () => {
            setIsLoading(true);
            setError(null);
            setArticle(null);
            console.log(`Fetching article details for PMID: ${pmid}`);
            try {
                const fetchedArticle = await getPubMedArticleDetails(pmid);
                if (!isMounted) return; // Exit if component unmounted

                if (fetchedArticle) {
                    console.log("Article details fetched:", fetchedArticle);
                    setArticle(fetchedArticle);
                } else {
                    setError(`无法找到 PMID 为 ${pmid} 的文章。`);
                }
            } catch (err: any) {
                if (!isMounted) return;
                console.error("Error fetching article details:", err);
                setError(err.message || "获取文章详情时出错。");
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchDetails();

        return () => { isMounted = false; }; // Cleanup function

    }, [pmid]); // Re-run effect if PMID changes

    const pubmedUrl = article ? `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/` : '#';

    if (isLoading) {
        return (
            <div className="container mx-auto max-w-4xl py-8 px-4 mt-16 min-h-screen flex justify-center items-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <main className="container mx-auto max-w-4xl py-8 px-4 mt-16 min-h-screen">
                <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-6">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    返回
                </Button>
                <Card className="border-destructive bg-destructive/10">
                    <CardContent className="p-6 flex items-center space-x-3">
                        <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0" />
                        <p className="text-lg text-destructive/90 font-medium">错误: {error}</p>
                    </CardContent>
                </Card>
            </main>
        );
    }

    if (!article) {
        // This case should ideally be covered by the error state if fetch returns null
        return (
            <main className="container mx-auto max-w-4xl py-8 px-4 mt-16 min-h-screen">
                <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-6">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    返回
                </Button>
                <p className="text-center text-muted-foreground text-xl">未找到文章。</p>
            </main>
        );
    }

    return (
        <main className="container mx-auto max-w-4xl py-8 px-4 mt-16 min-h-screen">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    返回搜索结果
                </Button>
                {/* Add Collect Button Here */}
                <CollectPubMedButton article={article} />
            </div>

            <article className="space-y-5">
                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-semibold text-primary dark:text-primary-foreground mb-3 text-justify break-words">
                    {article.title}
                </h1>

                {/* Meta Info */}
                <div className="text-sm text-muted-foreground space-y-1">
                    <p className="break-words"><strong>PMID:</strong> {article.pmid}</p>
                    {/* Display PMCID if available */}
                    {article.pmcid && (
                        <p className="break-words">
                            <strong>PMCID:</strong>
                            <a
                                href={`https://www.ncbi.nlm.nih.gov/pmc/articles/${article.pmcid}/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-1 text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                PMC{article.pmcid} <ExternalLink className="inline-block ml-1 h-3 w-3" />
                            </a>
                        </p>
                    )}
                    {/* Display DOI if available */}
                    {article.doi && (
                        <p className="break-words">
                            <strong>DOI:</strong>
                            <a
                                href={`https://doi.org/${article.doi}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-1 text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                {article.doi} <ExternalLink className="inline-block ml-1 h-3 w-3" />
                            </a>
                        </p>
                    )}
                    <p className="break-words"><strong>Authors:</strong> {article.authors}</p>
                    <p className="break-words"><strong>Journal:</strong> {article.journal} ({article.pubdate})</p>
                    <p>
                        <a
                            href={pubmedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            在 PubMed 上查看 <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                    </p>
                </div>

                {/* Divider */}
                <hr className="my-6 border-border" />

                {/* Abstract */}
                {article.abstract ? (
                    <div className="space-y-3">
                        <h2 className="text-2xl font-medium">摘要</h2>
                        <div className="prose prose-slate dark:prose-invert max-w-none text-justify leading-relaxed">
                            {/* Render abstract using ReactMarkdown or simple pre-wrap */}
                            {/* Using pre-wrap for simplicity with the bold labels */}
                            <p style={{ whiteSpace: 'pre-wrap' }}>{article.abstract}</p>
                            {/* OR using ReactMarkdown if needed 
                             <ReactMarkdown 
                                 components={{ 
                                     // Customize if needed, e.g., for links 
                                 }}
                             > 
                                 {article.abstract}
                             </ReactMarkdown> 
                             */}
                        </div>
                    </div>
                ) : (
                    <p className="text-muted-foreground italic">此文章无可用摘要。</p>
                )}
            </article>
        </main >
    );
}
