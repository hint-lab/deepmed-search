"use client"

import React from 'react'; // Import React
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Globe, Database, FileText, Loader2, ChevronDown } from "lucide-react"
import { useState } from "react"
import { useSendQuestion } from "@/hooks/use-search"
import MarkdownContent from "@/components/markdown-content"
import { useTranslate } from '@/hooks/use-language' // Keep this import
import { TFunction } from 'i18next'; // Import TFunction from i18next
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

type SearchType = 'web' | 'llm' | 'kb';
type LlmModelType = 'gemini' | 'gpt' | 'deepseek'; // Define LLM model types

// --- Internal Search Form Component ---
interface SearchInputFormProps {
    searchType: SearchType;
    searchStr: string;
    disableInteractions: boolean;
    isKbSearching: boolean;
    isSubmittingWebOrLLM: boolean;
    isSearchStrEmpty: boolean;
    onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmitKb: (event: React.FormEvent<HTMLFormElement>) => void;
    onLLMSelect: (model: LlmModelType) => void;
    onWebEngineSelect: (engine: SearchEngineType) => void;
    t: TFunction; // Use imported TFunction type (no namespace needed here, it's generic)
}

const SearchInputForm: React.FC<SearchInputFormProps> = ({
    searchType,
    searchStr,
    disableInteractions,
    isKbSearching,
    isSubmittingWebOrLLM,
    isSearchStrEmpty,
    onInputChange,
    onSubmitKb,
    onLLMSelect,
    onWebEngineSelect,
    t
}) => {
    return (
        <form onSubmit={onSubmitKb} className="mt-6">
            <div className="flex items-center focus-within:ring-2 focus-within:ring-primary/30 focus-within:ring-offset-2 focus-within:ring-offset-background rounded-lg transition-all duration-150">
                <div className="relative flex-grow">
                    <Input
                        id="search-query"
                        type="text"
                        value={searchStr}
                        onChange={onInputChange}
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
                                {isSubmittingWebOrLLM ? (
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
                            <DropdownMenuLabel>{t('selectSearchEngine', '选择搜索引擎')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => onWebEngineSelect('tavily')}>
                                Tavily AI
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onWebEngineSelect('jina')}>
                                Jina Search
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onWebEngineSelect('duckduckgo')}>
                                DuckDuckGo
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : searchType === 'llm' ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                disabled={disableInteractions || isSearchStrEmpty}
                                className="flex-shrink-0 h-12 rounded-l-none rounded-r-lg px-4 border-y border-r border-border/80 bg-gradient-to-r from-purple-600 to-indigo-600 text-white transition-all focus-visible:ring-0 focus-visible:ring-offset-0"
                            >
                                {isSubmittingWebOrLLM ? (
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
                            <DropdownMenuLabel>{t('selectLlmModel', '选择 LLM 模型')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => onLLMSelect('gemini')}>
                                Gemini
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onLLMSelect('gpt')}>
                                GPT
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onLLMSelect('deepseek')}>
                                DeepSeek
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : ( // searchType === 'kb'
                    <Button
                        type="submit"
                        disabled={disableInteractions || isSearchStrEmpty}
                        className="flex-shrink-0 h-12 rounded-l-none rounded-r-lg px-6 border-y border-r border-border/80 bg-gradient-to-r from-green-500 to-blue-500 text-white transition-all focus-visible:ring-0 focus-visible:ring-offset-0"
                    >
                        {isKbSearching ? (
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
    );
};

// --- Internal KB Results Display Component ---
interface KbResultsDisplayProps {
    answer: any; // Keep type flexible for now
    t: TFunction; // Use imported TFunction type
}

const KbResultsDisplay: React.FC<KbResultsDisplayProps> = ({ answer, t }) => {
    return (
        <>
            <div className="border-t border-border/60 pt-8 mt-8 space-y-4">
                <h2 className="text-xl font-semibold">{t("searchResults", "搜索结果")}</h2>
                <Card className="bg-card/80">
                    <CardContent className="p-6">
                        <MarkdownContent content={typeof answer === 'string' ? answer : JSON.stringify(answer, null, 2)} />
                    </CardContent>
                </Card>
            </div>
            <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">{t("searchTips", "搜索技巧")}</h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground text-sm">
                    <li>{t("tipKb1", "确保问题与知识库内容相关。")}</li>
                    <li>{t("tipKb2", "尝试使用知识库中的关键词。")}</li>
                    <li>{t("tipGeneral", "保持问题简洁明了。")}</li>
                </ul>
            </div>
        </>
    );
};


// --- Main Search Page Component ---
export default function SearchPage() {
    const { t } = useTranslate('search')
    const router = useRouter();
    const [searchType, setSearchType] = useState<SearchType>('llm');

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

    const handleSubmitKb = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        // Ensure KB submit only happens when 'kb' tab is active
        if (searchType !== 'kb' || isSearchStrEmpty || isSubmitting || isPending) return;

        // Use isPending directly for KB loading state, isSubmitting for Web/LLM
        // No need to setIsSubmitting(true) here, as isPending handles KB search loading
        console.log(`Performing search with type: ${searchType} for query: ${searchStr}`);
        try {
            await sendQuestion(searchStr);
        } catch (error) {
            console.error("KB Search failed:", error);
            // Optionally reset state or show error message
        }
        // isPending will automatically become false when sendQuestion finishes
    }

    const handleLLMSelect = (model: LlmModelType) => {
        console.log(`handleLLMSelect called with model: ${model}, isSearchStrEmpty: ${isSearchStrEmpty}, searchStr: \"${searchStr}\"`);
        if (isSearchStrEmpty) return;
        setIsSubmitting(true); // Use isSubmitting for Web/LLM navigation indication
        try {
            const encodedQuery = encodeURIComponent(searchStr);
            router.push(`/search/llm/${encodedQuery}?model=${model}`);
        } catch (e) {
            console.error("Navigation failed:", e);
            setIsSubmitting(false);
        }
        // Reset submitting state after a short delay to allow navigation/visual feedback
        setTimeout(() => setIsSubmitting(false), 500);
    };

    const handleWebEngineSelect = (engine: SearchEngineType) => {
        console.log(`handleWebEngineSelect called with engine: ${engine}, isSearchStrEmpty: ${isSearchStrEmpty}, searchStr: \"${searchStr}\"`);
        if (isSearchStrEmpty) return;
        setIsSubmitting(true); // Use isSubmitting for Web/LLM navigation indication
        try {
            const encodedQuery = encodeURIComponent(searchStr);
            router.push(`/search/web/${encodedQuery}?engine=${engine}`);
        } catch (e) {
            console.error("Navigation failed:", e);
            setIsSubmitting(false);
        }
        // Reset submitting state after a short delay
        setTimeout(() => setIsSubmitting(false), 500);
    };

    const disableInteractions = isPending || isSubmitting;
    const showKbResults = !isPending && !!answer && searchType === 'kb';

    return (
        <main className={`flex min-h-screen flex-col items-center p-6 sm:p-10 md:p-16 bg-gradient-to-b from-background via-background to-muted/10 pt-24 sm:pt-20 ${!showKbResults && !isPending ? 'justify-center' : 'justify-start'}`}>
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
                            <TabsTrigger value="llm" disabled={disableInteractions}>
                                <Database className="mr-2 h-4 w-4" /> {t("llmSearch", "LLM内省")}
                            </TabsTrigger>
                            <TabsTrigger value="kb" disabled={disableInteractions}>
                                <FileText className="mr-2 h-4 w-4" /> {t("kbSearch", "知识库搜索")}
                            </TabsTrigger>
                        </TabsList>
                        {/* Use the internal SearchInputForm component */}
                        <SearchInputForm
                            searchType={searchType}
                            searchStr={searchStr}
                            disableInteractions={disableInteractions}
                            isKbSearching={isPending && searchType === 'kb'} // Pass KB specific loading state
                            isSubmittingWebOrLLM={isSubmitting} // Pass Web/LLM specific loading state
                            isSearchStrEmpty={isSearchStrEmpty}
                            onInputChange={handleInputChange}
                            onSubmitKb={handleSubmitKb}
                            onLLMSelect={handleLLMSelect}
                            onWebEngineSelect={handleWebEngineSelect}
                            t={t}
                        />
                    </div>

                    {/* Loading indicator specifically for KB search */}
                    {isPending && searchType === 'kb' && (
                        <div className="flex justify-center items-center space-x-3 mb-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">{t("loadingMessage", "正在努力搜索，请稍候...")}</p>
                        </div>
                    )}

                    {/* Placeholder content for tabs */}
                    <TabsContent value="web">
                        {!isPending && !answer && <p className="text-center text-sm text-muted-foreground">{t("webSearchInfo", "输入查询后点击搜索按钮选择引擎。")}</p>}
                    </TabsContent>
                    <TabsContent value="llm">
                        {!isPending && !answer && <p className="text-center text-sm text-muted-foreground">{t("llmSearchInfo", "LLM 内省将使用大模型生成模拟搜索结果。")}</p>}
                    </TabsContent>
                    <TabsContent value="kb">
                        {!isPending && !answer && searchType === 'kb' && <p className="text-center text-sm text-muted-foreground">{t("kbSearchInfo", "知识库搜索将查询您已上传的文档。")}</p>}
                    </TabsContent>
                </Tabs>

                {/* Use the internal KbResultsDisplay component */}
                {showKbResults && <KbResultsDisplay answer={answer} t={t} />}

            </div>
        </main>
    )
} 