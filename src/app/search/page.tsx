"use client"

import React from 'react'; // Import React
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Globe, Database, FileText, Loader2, ChevronDown, FlaskConical } from "lucide-react"
import { useState } from "react"
import { useSendQuestion } from "@/hooks/use-search"
import MarkdownContent from "@/components/extensions/markdown-content"
import { useTranslate } from '@/contexts/language-context'; // Import only useTranslate
import { TFunction } from 'i18next'; // Add import for TFunction
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
import { useKnowledgeBase } from '@/contexts/knowledgebase-context'

type SearchType = 'web' | 'llm' | 'kb' | 'pubmed';
type LlmModelType = 'gemini' | 'gpt' | 'deepseek'; // Define LLM model types

// Define Knowledge Base type
interface KnowledgeBase {
    id: string;
    name: string;
}

// --- Internal Search Form Component ---
interface SearchInputFormProps {
    searchType: SearchType;
    searchStr: string;
    disableInteractions: boolean;
    isKbSearching: boolean;
    isSubmittingWebOrLLM: boolean;
    isSearchStrEmpty: boolean;
    onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onLLMSelect: (model: LlmModelType) => void;
    onWebEngineSelect: (engine: SearchEngineType) => void;
    onKbSelect: (kbId: string) => void;
    availableKbs: KnowledgeBase[];
    t: TFunction; // Uses TFunction from i18next
    isKbListLoading: boolean;
}

const SearchInputForm: React.FC<SearchInputFormProps> = ({
    searchType,
    searchStr,
    disableInteractions,
    isKbSearching,
    isSubmittingWebOrLLM,
    isSearchStrEmpty,
    onInputChange,
    onLLMSelect,
    onWebEngineSelect,
    onKbSelect,
    availableKbs,
    t,
    isKbListLoading
}) => {
    return (
        <form onSubmit={(e) => e.preventDefault()} className="mt-6">
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
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                disabled={isKbListLoading || disableInteractions || isSearchStrEmpty}
                                className="flex-shrink-0 h-12 rounded-l-none rounded-r-lg px-4 border-y border-r border-border/80 bg-gradient-to-r from-green-500 to-blue-500 text-white transition-all focus-visible:ring-0 focus-visible:ring-offset-0"
                            >
                                {isKbSearching ? (
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
                            {isKbListLoading ? (
                                <DropdownMenuItem disabled>加载知识库中...</DropdownMenuItem>
                            ) : (
                                <>
                                    <DropdownMenuLabel>{t('selectKnowledgeBase', '选择知识库')}</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {availableKbs.length > 0 ? (
                                        availableKbs.map((kb) => (
                                            <DropdownMenuItem key={kb.id} onSelect={() => onKbSelect(kb.id)}>
                                                {kb.name}
                                            </DropdownMenuItem>
                                        ))
                                    ) : (
                                        <DropdownMenuItem disabled>无可用知识库</DropdownMenuItem>
                                    )}
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </form>
    );
};

// --- Main Search Page Component ---
export default function SearchPage() {
    const { t } = useTranslate('search')
    const router = useRouter();
    const [searchType, setSearchType] = useState<SearchType>('llm');

    const {
        handleSearchStrChange,
        answer,
        sendingLoading: isPending, // True when LLM/KB search is in progress
        searchStr,
        isSearchStrEmpty,
    } = useSendQuestion([])

    const {
        knowledgeBases,
        isLoading: isKbListLoading,
    } = useKnowledgeBase();

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        handleSearchStrChange(event);
    }

    const [isSubmitting, setIsSubmitting] = useState(false); // True during navigation attempt

    // --- Event Handlers (LLM, Web, KB, PubMed) --- 
    const handleLLMSelect = (model: LlmModelType) => {
        if (isSearchStrEmpty || isSubmitting || isPending) return;
        setIsSubmitting(true);
        try {
            const encodedQuery = encodeURIComponent(searchStr);
            router.push(`/search/llm/${encodedQuery}?model=${model}`);
        } catch (e) {
            console.error("Navigation failed:", e);
            setIsSubmitting(false); // Only reset if error
        }
        // Don't reset isSubmitting here, let navigation complete or fail
    };

    const handleWebEngineSelect = (engine: SearchEngineType) => {
        if (isSearchStrEmpty || isSubmitting || isPending) return;
        setIsSubmitting(true);
        try {
            const encodedQuery = encodeURIComponent(searchStr);
            router.push(`/search/web/${encodedQuery}?engine=${engine}`);
        } catch (e) {
            console.error("Navigation failed:", e);
            setIsSubmitting(false);
        }
    };

    const handleKbSelect = (kbId: string) => {
        if (isSearchStrEmpty || isSubmitting || isPending) return;
        // Trigger the actual KB search using useSendQuestion's mechanism
        // (Assuming useSendQuestion needs kbId and searchStr)
        // This might involve calling a function returned by useSendQuestion
        // For now, let's keep the navigation logic if that was intended, but ideally
        // this should trigger the search *within* this page using isPending state.
        // --- Keeping original navigation logic for now --- 
        setIsSubmitting(true);
        try {
            const encodedQuery = encodeURIComponent(searchStr);
            // If useSendQuestion handles KB search, remove router.push
            router.push(`/search/kb/${encodedQuery}?kbId=${kbId}`);
        } catch (e) {
            console.error("KB Navigation failed:", e);
            setIsSubmitting(false);
        }
        // --- End original navigation logic --- 
    };

    const handlePubMedSubmit = () => {
        if (isSearchStrEmpty || isSubmitting || isPending) return;
        setIsSubmitting(true);
        try {
            const encodedQuery = encodeURIComponent(searchStr);
            router.push(`/search/pubmed/${encodedQuery}`);
        } catch (error) {
            console.error("Error navigating to PubMed search:", error);
            setIsSubmitting(false);
        }
    };

    // --- Refined Disable Logic --- 
    const disableInput = isSubmitting || ((searchType === 'llm' || searchType === 'kb') && isPending);
    const disableTabs = isSubmitting;

    // Handle tab change without clearing answer
    const handleTabChange = (value: string) => {
        const newSearchType = value as SearchType;
        setSearchType(newSearchType);
    };

    return (
        <main className={`flex min-h-screen flex-col items-center p-6 sm:p-10 md:p-16 bg-gradient-to-b from-background via-background to-muted/10 pt-24 sm:pt-20 justify-center`}>
            <div className="w-full max-w-3xl space-y-8">
                {/* Pass handleTabChange to Tabs component */}
                <Tabs value={searchType} onValueChange={handleTabChange} className="w-full">
                    <div className="text-center space-y-3 my-6 sm:my-8">
                        <h1 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 from-blue-600 via-purple-600 to-pink-600">
                            {t("title")}
                        </h1>
                        <p className="text-muted-foreground">
                            {t("description", "在网页、大模型内部或知识库中快速查找信息")}
                        </p>
                        <TabsList className="grid w-full grid-cols-4 mb-4">
                            {/* Disable tabs only during navigation */}
                            <TabsTrigger value="web" disabled={disableTabs}>
                                <Globe className="mr-2 h-4 w-4" /> {t("webSearch", "网页搜索")}
                            </TabsTrigger>
                            <TabsTrigger value="llm" disabled={disableTabs}>
                                <Database className="mr-2 h-4 w-4" /> {t("llmSearch", "LLM内省")}
                            </TabsTrigger>
                            <TabsTrigger value="kb" disabled={disableTabs}>
                                <FileText className="mr-2 h-4 w-4" /> {t("kbSearch", "知识库搜索")}
                            </TabsTrigger>
                            <TabsTrigger value="pubmed" disabled={disableTabs}>
                                <FlaskConical className="mr-2 h-4 w-4" /> {t("pubmedSearch", "PubMed")}
                            </TabsTrigger>
                        </TabsList>

                        {/* Render SearchInputForm only for relevant tabs */}
                        {(searchType === 'web' || searchType === 'llm' || searchType === 'kb') && (
                            <SearchInputForm
                                searchType={searchType}
                                searchStr={searchStr}
                                // Use refined disableInput for the input field itself
                                disableInteractions={disableInput}
                                // Correctly pass isPending for KB search state
                                isKbSearching={searchType === 'kb' && isPending}
                                // Pass isSubmitting for Web/LLM button loading state (during navigation)
                                isSubmittingWebOrLLM={isSubmitting && (searchType === 'web' || searchType === 'llm')}
                                isSearchStrEmpty={isSearchStrEmpty}
                                onInputChange={handleInputChange}
                                onLLMSelect={handleLLMSelect}
                                onWebEngineSelect={handleWebEngineSelect}
                                onKbSelect={handleKbSelect}
                                availableKbs={knowledgeBases.map(kb => ({ id: kb.id, name: kb.name || `KB ${kb.id}` }))}
                                t={t}
                                // Pass KB list loading state specifically for KB dropdown disabling
                                isKbListLoading={isKbListLoading}
                            />
                        )}
                        {/* Render PubMed form only for its tab */}
                        {searchType === 'pubmed' && (
                            <form onSubmit={(e) => { e.preventDefault(); handlePubMedSubmit(); }} className="mt-6">
                                <div className="flex items-center focus-within:ring-2 focus-within:ring-primary/30 focus-within:ring-offset-2 focus-within:ring-offset-background rounded-lg transition-all duration-150">
                                    <div className="relative flex-grow">
                                        <Input
                                            id="pubmed-search-query"
                                            type="text"
                                            value={searchStr}
                                            onChange={handleInputChange}
                                            placeholder={t("pubmedPlaceholder", "输入 PubMed 查询词...")}
                                            // Disable input only during navigation attempt
                                            disabled={isSubmitting}
                                            className="h-12 text-base rounded-l-lg rounded-r-none border-r-0 border border-border/80 px-5 w-full focus-visible:ring-0 focus-visible:ring-offset-0"
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        // Disable PubMed button during navigation or if input empty
                                        disabled={isSubmitting || isSearchStrEmpty}
                                        className="flex-shrink-0 h-12 rounded-l-none rounded-r-lg px-4 border-y border-r border-border/80 bg-gradient-to-r from-teal-500 to-cyan-600 text-white transition-all focus-visible:ring-0 focus-visible:ring-offset-0"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <Search className="h-5 w-5" />
                                        )}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Placeholder content for tabs - No changes needed here */}
                    <TabsContent value="web">
                        <div className="mt-8 text-center text-sm text-muted-foreground">
                            {t("webInfo", "在网页中搜索信息。")}
                        </div>
                    </TabsContent>
                    <TabsContent value="llm">
                        <div className="mt-8 text-center text-sm text-muted-foreground">
                            {t("llmInfo", "在 LLM 中搜索信息。")}
                        </div>
                    </TabsContent>
                    <TabsContent value="kb">
                        <div className="mt-8 text-center text-sm text-muted-foreground">
                            {t("kbInfo", "在知识库中搜索信息。")}
                        </div>
                    </TabsContent>
                    <TabsContent value="pubmed">
                        <div className="mt-8 text-center text-sm text-muted-foreground">
                            {t("pubmedInfo", "在 PubMed 数据库中搜索医学文献。")}
                        </div>
                    </TabsContent>
                </Tabs>



                {/* Displaying LLM/KB loading - No changes needed here */}
                {(searchType === 'llm' || searchType === 'kb') && isPending && (
                    <div className="flex justify-center items-center space-x-3 my-10 p-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-lg text-muted-foreground">{t("processing", "处理中...")}</p>
                    </div>
                )}

            </div>
        </main>
    )
} 