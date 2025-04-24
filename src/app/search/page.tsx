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
import { useTranslate } from '@/hooks/use-language'; // Import only useTranslate
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

type SearchType = 'web' | 'llm' | 'kb';
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

// --- Internal KB Results Display Component ---
interface KbResultsDisplayProps {
    answer: any; // Keep type flexible for now
    t: TFunction; // Uses TFunction from i18next
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
        handleSearchStrChange,
        answer,
        sendingLoading: isPending,
        searchStr,
        isSearchStrEmpty,
    } = useSendQuestion([])

    // Get KB context
    const {
        knowledgeBases, // Use this list
        isLoading: isKbListLoading, // Use this for loading state
        fetchKnowledgeBases // Optional: trigger a refresh if needed, though context likely fetches on mount
    } = useKnowledgeBase();

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        handleSearchStrChange(event);
    }

    const [isSubmitting, setIsSubmitting] = useState(false);

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
        setTimeout(() => setIsSubmitting(false), 500);
    };

    const handleKbSelect = (kbId: string) => {
        console.log(`handleKbSelect called with kbId: ${kbId}, isSearchStrEmpty: ${isSearchStrEmpty}, searchStr: \"${searchStr}\"`);
        if (isSearchStrEmpty) return;
        setIsSubmitting(true); // Use isSubmitting for KB navigation indication
        try {
            const encodedQuery = encodeURIComponent(searchStr);
            router.push(`/search/kb/${encodedQuery}?kbId=${kbId}`);
        } catch (e) {
            console.error("KB Navigation failed:", e);
            setIsSubmitting(false);
        }
        setTimeout(() => setIsSubmitting(false), 500);
    };

    const disableInteractions = isPending || isSubmitting || isKbListLoading;

    return (
        <main className={`flex min-h-screen flex-col items-center p-6 sm:p-10 md:p-16 bg-gradient-to-b from-background via-background to-muted/10 pt-24 sm:pt-20 justify-center`}>
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
                            isKbSearching={isSubmitting && searchType === 'kb'}
                            isSubmittingWebOrLLM={isSubmitting && (searchType === 'web' || searchType === 'llm')}
                            isSearchStrEmpty={isSearchStrEmpty}
                            onInputChange={handleInputChange}
                            onLLMSelect={handleLLMSelect}
                            onWebEngineSelect={handleWebEngineSelect}
                            onKbSelect={handleKbSelect}
                            availableKbs={knowledgeBases.map(kb => ({ id: kb.id, name: kb.name || `KB ${kb.id}` }))}
                            t={t}
                            isKbListLoading={isKbListLoading}
                        />
                    </div>

                    {/* Placeholder content for tabs */}
                    <TabsContent value="web">
                        {!isPending && !answer && <p className="text-center text-sm text-muted-foreground">{t("webSearchInfo", "输入查询后点击搜索按钮选择引擎。")}</p>}
                    </TabsContent>
                    <TabsContent value="llm">
                        {!isPending && !answer && <p className="text-center text-sm text-muted-foreground">{t("llmSearchInfo", "LLM 内省将使用大模型生成模拟搜索结果。")}</p>}
                    </TabsContent>
                    <TabsContent value="kb">
                        {!isPending && !answer && searchType === 'kb' && <p className="text-center text-sm text-muted-foreground">{t("kbSearchInfo", "输入查询后，点击搜索按钮选择知识库。")}</p>}
                    </TabsContent>
                </Tabs>

            </div>
        </main>
    )
} 