"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTranslation } from "react-i18next"
import { CircleStop, SendHorizontal, Search, Globe, Database, FileText, Loader2, ChevronDown } from "lucide-react"
import { useState } from "react"
import { useSendQuestion } from "@/hooks/use-search"
import SearchSidebar from "./components/search-sidebar"
import MarkdownContent from "@/components/markdown-content"
import RetrievalDocuments from "./components/retrieval-documents"
import { Badge } from "@/components/ui/badge"
import { VectorSearch } from '@/components/search-vector'
import { useTranslate } from '@/hooks/use-language'
import { useRouter } from 'next/navigation'
import { SearchEngineType } from '@/actions/web-search'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type SearchType = 'web' | 'local' | 'chunk';

export default function SearchPage() {
    const { t } = useTranslate('search')
    const router = useRouter();
    const [searchType, setSearchType] = useState<SearchType>('local');

    const {
        sendQuestion,
        handleSearchStrChange,
        answer,
        sendingLoading: isPending,
        searchStr,
        isSearchStrEmpty,
    } = useSendQuestion([])

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        handleSearchStrChange(event);
    }

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmitLocalOrChunk = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (searchType === 'web' || isSearchStrEmpty || isSubmitting || isPending) return;

        setIsSubmitting(true);
        console.log(`Performing search with type: ${searchType} for query: ${searchStr}`);
        try {
            await sendQuestion(searchStr);
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleWebEngineSelect = (engine: SearchEngineType) => {
        // --- DEBUG LOG --- //
        console.log(`handleWebEngineSelect called with engine: ${engine}, isSearchStrEmpty: ${isSearchStrEmpty}, searchStr: "${searchStr}"`);
        // --- END DEBUG LOG --- //

        if (isSearchStrEmpty) return;
        setIsSubmitting(true);
        try {
            const encodedQuery = encodeURIComponent(searchStr);
            router.push(`/search/web/${encodedQuery}?engine=${engine}`);
        } catch (e) {
            console.error("Navigation failed:", e);
            setIsSubmitting(false);
        }
        setTimeout(() => setIsSubmitting(false), 500);
    };

    const disableInteractions = isPending || isSubmitting;
    const showLocalChunkResults = !isPending && !!answer && searchType !== 'web';

    return (
        <main className={`flex min-h-screen flex-col items-center p-6 sm:p-10 md:p-16 bg-gradient-to-b from-background via-background to-muted/10 pt-24 sm:pt-20 ${!showLocalChunkResults && !isPending ? 'justify-center' : 'justify-start'}`}>
            <div className="w-full max-w-3xl space-y-8">


                <Tabs value={searchType} onValueChange={(value) => setSearchType(value as SearchType)} className="w-full">

                    <div className="text-center space-y-3 my-6 sm:my-8">
                        <h1 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 from-blue-600 via-purple-600 to-pink-600">
                            {t("title")}
                        </h1>
                        <p className="text-muted-foreground">
                            {t("description", "在网页、大模型内部或知识库中快速查找信息")}
                        </p>
                        <TabsList className="grid w-full grid-cols-3 mb-4">
                            <TabsTrigger value="web" disabled={disableInteractions}>
                                <Globe className="mr-2 h-4 w-4" /> {t("webSearch", "网页搜索")}
                            </TabsTrigger>
                            <TabsTrigger value="local" disabled={disableInteractions}>
                                <Database className="mr-2 h-4 w-4" /> {t("localSearch", "内省搜索")}
                            </TabsTrigger>
                            <TabsTrigger value="chunk" disabled={disableInteractions}>
                                <FileText className="mr-2 h-4 w-4" /> {t("chunkSearch", "知识库搜索")}
                            </TabsTrigger>
                        </TabsList>
                        <form onSubmit={handleSubmitLocalOrChunk} className="mt-6">
                            <div className="flex items-center focus-within:ring-2 focus-within:ring-primary/30 focus-within:ring-offset-2 focus-within:ring-offset-background rounded-lg transition-all duration-150">
                                <div className="relative flex-grow">
                                    <Input
                                        id="search-query"
                                        type="text"
                                        value={searchStr}
                                        onChange={handleInputChange}
                                        placeholder={t("searchPlaceholder", "输入您的问题或关键词...")}
                                        disabled={disableInteractions}
                                        className="h-12 text-base rounded-l-lg rounded-r-none border-r-0 border border-border/80 px-5 w-full focus-visible:ring-0 focus-visible:ring-offset-0"
                                    />
                                </div>
                                {searchType === 'web' ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                type="button"
                                                disabled={disableInteractions || isSearchStrEmpty}
                                                className="flex-shrink-0 h-12 rounded-l-none rounded-r-lg px-4 border-y border-r border-border/80 bg-gradient-to-r from-blue-500 to-purple-600 text-white transition-all focus-visible:ring-0 focus-visible:ring-offset-0"
                                            >
                                                {isSubmitting ? (
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Search className="h-5 w-5 mr-1" />
                                                        <ChevronDown className="h-4 w-4 ml-1" />
                                                    </>
                                                )}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>选择搜索引擎</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onSelect={() => handleWebEngineSelect('tavily')}>
                                                Tavily AI
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleWebEngineSelect('jina')}>
                                                Jina Search
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleWebEngineSelect('duckduckgo')}>
                                                DuckDuckGo
                                            </DropdownMenuItem>

                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : (
                                    <Button
                                        type="submit"
                                        disabled={disableInteractions || isSearchStrEmpty}
                                        className="flex-shrink-0 h-12 rounded-l-none rounded-r-lg px-6 border-y border-r border-border/80 bg-gradient-to-r from-blue-500 to-purple-600 text-white transition-all focus-visible:ring-0 focus-visible:ring-offset-0"
                                    >
                                        {isPending ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                {t("searching", "搜索中...")}
                                            </>
                                        ) : (
                                            <Search className="h-5 w-5" />
                                        )}
                                    </Button>
                                )}
                            </div>
                        </form>

                    </div>

                    {isPending && searchType !== 'web' && (
                        <div className="flex justify-center items-center space-x-3 mb-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">{t("loadingMessage", "正在努力搜索，请稍候...")}</p>
                        </div>
                    )}
                    <TabsContent value="web">
                        {!isPending && !answer && <p className="text-center text-sm text-muted-foreground">{t("webSearchInfo", "输入查询后点击 <SearchIcon/> 选择引擎开始网页搜索。")}</p>}
                    </TabsContent>
                    <TabsContent value="local">
                        {!isPending && !answer && <p className="text-center text-sm text-muted-foreground">{t("localSearchInfo", "本地搜索将查询您已上传的文档。")}</p>}
                    </TabsContent>
                    <TabsContent value="chunk">
                        {!isPending && !answer && <p className="text-center text-sm text-muted-foreground">{t("chunkSearchInfo", "Chunk 搜索将在知识库的特定片段中查找。")}</p>}
                    </TabsContent>
                </Tabs>

                {showLocalChunkResults && (
                    <div className="border-t border-border/60 pt-8 mt-8 space-y-4">
                        <h2 className="text-xl font-semibold">{t("searchResults", "搜索结果")}</h2>
                        <Card className="bg-card/80">
                            <CardContent className="p-6">
                                <MarkdownContent content={typeof answer === 'string' ? answer : JSON.stringify(answer, null, 2)} />
                            </CardContent>
                        </Card>
                    </div>
                )}

                {showLocalChunkResults && (
                    <div className="mt-8">
                        <h2 className="text-xl font-semibold mb-4">{t("searchTips", "搜索技巧")}</h2>
                        <ul className="list-disc list-inside space-y-2 text-muted-foreground text-sm">
                            {searchType === 'local' && <>
                                <li>{t("tipLocal1", "把基础大模型当作知识库来检索。")}</li>
                                <li>{t("tipLocal2", "使用具体的医疗术语或症状描述。")}</li>
                                <li>{t("tipLocal3", "尝试用不同的方式提问。")}</li>
                            </>}
                            {searchType === 'chunk' && <>
                                <li>{t("tipChunk1", "尽可能精确地描述您要查找的知识片段。")}</li>
                                <li>{t("tipChunk2", "如果结果不理想，尝试调整知识库范围或 Chunk 设置。")}</li>
                            </>}
                            <li>{t("tipGeneral", "保持问题简洁明了。")}</li>
                        </ul>
                    </div>
                )}
            </div>
        </main>
    )
} 