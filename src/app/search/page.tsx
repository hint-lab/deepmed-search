"use client"

import React from 'react'; // Import React
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Globe, Database, FileText, Loader2, ChevronDown, FlaskConical, Check } from "lucide-react"
import { useState, useEffect } from "react"
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
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group"
import { useKnowledgeBaseContext } from '@/contexts/knowledgebase-context'
import { SearchSuggestions } from '@/components/search-suggestions' 
import { Slider } from "@/components/ui/slider"
import { useSession } from 'next-auth/react'
import { getUserSearchConfig, getUserLLMConfigs } from '@/actions/user'

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
    onKbSelectOnly?: (kbId: string) => void;
    onKbSearchClick?: () => void;
    availableKbs: KnowledgeBase[];
    t: TFunction; // Uses TFunction from i18next
    isKbListLoading: boolean;
    kbSearchMode: 'vector' | 'bm25' | 'hybrid';
    onKbModeChange: (mode: 'vector' | 'bm25' | 'hybrid') => void;
    bm25Weight: number;
    vectorWeight: number;
    onKbModeWeightChange: (type: string, value: number) => void;
    availableSearchEngines: SearchEngineType[];
    availableLLMModels: LlmModelType[];
    selectedSearchEngine: SearchEngineType | null;
    selectedLLMModel: LlmModelType | null;
    selectedKbId: string | null;
    isSubmitting: boolean;
    isPending: boolean;
    onModelSelectOnly?: (model: LlmModelType) => void;
    onEngineSelectOnly?: (engine: SearchEngineType) => void;
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
    onKbSelectOnly,
    onKbSearchClick,
    availableKbs,
    t,
    isKbListLoading,
    kbSearchMode,
    onKbModeChange,
    bm25Weight,
    vectorWeight,
    onKbModeWeightChange,
    availableSearchEngines = [],
    availableLLMModels = [],
    selectedSearchEngine,
    selectedLLMModel,
    selectedKbId,
    isSubmitting,
    isPending,
    onModelSelectOnly,
    onEngineSelectOnly
}) => {
    // 获取显示名称的辅助函数
    const getEngineDisplayName = (engine: SearchEngineType) => {
        return engine === 'tavily' ? 'Tavily AI' : engine === 'jina' ? 'Jina Search' : 'DuckDuckGo';
    };

    const getModelDisplayName = (model: LlmModelType) => {
        return model === 'gemini' ? 'Gemini' : model === 'gpt' ? 'GPT' : 'DeepSeek';
    };

    // 处理搜索按钮点击
    const handleSearchClick = () => {
        if (isSearchStrEmpty || disableInteractions) return;
        
        if (searchType === 'web' && selectedSearchEngine) {
            onWebEngineSelect(selectedSearchEngine);
        } else if (searchType === 'llm' && selectedLLMModel) {
            onLLMSelect(selectedLLMModel);
        }
    };

    // 处理表单提交（按 Enter 键时使用默认配置）
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSearchClick();
    };

    // 处理模型/引擎选择（只选择，不触发搜索）
    const handleModelSelectOnly = (model: LlmModelType) => {
        if (onModelSelectOnly) {
            onModelSelectOnly(model);
        }
    };

    const handleEngineSelectOnly = (engine: SearchEngineType) => {
        if (onEngineSelectOnly) {
            onEngineSelectOnly(engine);
        }
    };

    return (
        <form onSubmit={handleFormSubmit} className="mt-6">
            <div className="flex items-center focus-within:ring-2 focus-within:ring-primary/30 focus-within:ring-offset-2 focus-within:ring-offset-background rounded-lg transition-all duration-150">
                <div className="relative flex-grow">
                    <Input
                        id="search-query"
                        type="text"
                        value={searchStr}
                        onChange={onInputChange}
                        placeholder={t("searchPlaceholder", "输入您的问题或关键词...")}
                        disabled={disableInteractions}
                        className="rounded-l-lg rounded-r-none h-12 text-base border-r-0 border border-border/80 px-5 w-full focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                </div>
                {searchType === 'web' ? (
                    <ButtonGroup className="flex-shrink-0 h-12 rounded-l-none rounded-r-lg border-y border-r border-border/80 bg-cyan-600">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    type="button"
                                    disabled={disableInteractions || availableSearchEngines.length === 0}
                                    variant="outline"
                                    className="h-12 rounded-l-none rounded-r-none border-0 bg-transparent text-white hover:bg-white/20 disabled:opacity-50 disabled:text-white/70 focus-visible:ring-0 focus-visible:ring-offset-0"
                                >
                                    {selectedSearchEngine ? (
                                        <span className="text-sm font-medium">{getEngineDisplayName(selectedSearchEngine)}</span>
                                    ) : (
                                        <span className="text-sm font-medium">选择引擎</span>
                                    )}
                                    <ChevronDown className="h-4 w-4 ml-1" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={4}>
                                <DropdownMenuLabel>{t('selectSearchEngine', '选择搜索引擎')}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {availableSearchEngines.map((engine) => (
                                    <DropdownMenuItem 
                                        key={engine} 
                                        onSelect={() => handleEngineSelectOnly(engine)}
                                        className={`flex items-center justify-between ${selectedSearchEngine === engine ? 'bg-accent' : ''}`}
                                    >
                                        <span>{getEngineDisplayName(engine)}</span>
                                        {selectedSearchEngine === engine && (
                                            <Check className="h-4 w-4 ml-2" />
                                        )}
                                    </DropdownMenuItem>
                                ))}
                                {availableSearchEngines.length === 0 && (
                                    <DropdownMenuItem disabled>
                                        请先配置搜索引擎 API Key
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <ButtonGroupSeparator className="bg-white/30" />
                        <Button
                            type="button"
                            onClick={handleSearchClick}
                            disabled={disableInteractions || isSearchStrEmpty || availableSearchEngines.length === 0 || !selectedSearchEngine}
                            className="h-12 rounded-l-none rounded-r-lg border-0 bg-transparent text-white hover:bg-white/20 disabled:opacity-50 disabled:text-white/70 focus-visible:ring-0 focus-visible:ring-offset-0"
                        >
                            {isSubmittingWebOrLLM ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Search className="h-5 w-5" />
                            )}
                        </Button>
                    </ButtonGroup>
                ) : searchType === 'llm' ? (
                    <ButtonGroup className="flex-shrink-0 h-12 rounded-l-none rounded-r-lg border-y border-r border-border/80 bg-cyan-600">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    type="button"
                                    disabled={disableInteractions || availableLLMModels.length === 0}
                                    variant="outline"
                                    className="h-12 rounded-l-none rounded-r-none border-0 bg-transparent text-white hover:bg-white/20 disabled:opacity-50 disabled:text-white/70 focus-visible:ring-0 focus-visible:ring-offset-0"
                                >
                                    {selectedLLMModel ? (
                                        <span className="text-sm font-medium">{getModelDisplayName(selectedLLMModel)}</span>
                                    ) : (
                                        <span className="text-sm font-medium">选择模型</span>
                                    )}
                                    <ChevronDown className="h-4 w-4 ml-1" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={4}>
                                <DropdownMenuLabel>{t('selectLlmModel', '选择 LLM 模型')}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {availableLLMModels.map((model) => (
                                    <DropdownMenuItem 
                                        key={model} 
                                        onSelect={() => handleModelSelectOnly(model)}
                                        className={`flex items-center justify-between ${selectedLLMModel === model ? 'bg-accent' : ''}`}
                                    >
                                        <span>{getModelDisplayName(model)}</span>
                                        {selectedLLMModel === model && (
                                            <Check className="h-4 w-4 ml-2" />
                                        )}
                                    </DropdownMenuItem>
                                ))}
                                {availableLLMModels.length === 0 && (
                                    <DropdownMenuItem disabled>
                                        请先配置 LLM API Key
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <ButtonGroupSeparator className="bg-white/30" />
                        <Button
                            type="button"
                            onClick={handleSearchClick}
                            disabled={disableInteractions || isSearchStrEmpty || availableLLMModels.length === 0 || !selectedLLMModel}
                            className="h-12 rounded-l-none rounded-r-lg border-0 bg-transparent text-white hover:bg-white/20 disabled:opacity-50 disabled:text-white/70 focus-visible:ring-0 focus-visible:ring-offset-0"
                        >
                            {isSubmittingWebOrLLM ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Search className="h-5 w-5" />
                            )}
                        </Button>
                    </ButtonGroup>
                ) : ( // searchType === 'kb'
                    <ButtonGroup className="flex-shrink-0 h-12 rounded-l-none rounded-r-lg border-y border-r border-border/80 bg-cyan-600">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    type="button"
                                    disabled={isKbListLoading || disableInteractions}
                                    variant="outline"
                                    className="h-12 rounded-l-none rounded-r-none border-0 bg-transparent text-white hover:bg-white/20 disabled:opacity-50 disabled:text-white/70 focus-visible:ring-0 focus-visible:ring-offset-0"
                                >
                                    {selectedKbId ? (
                                        <span className="text-sm font-medium">
                                            {availableKbs.find(kb => kb.id === selectedKbId)?.name || '选择知识库'}
                                        </span>
                                    ) : (
                                        <span className="text-sm font-medium">选择知识库</span>
                                    )}
                                    <ChevronDown className="h-4 w-4 ml-1" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={4} className="w-96">
                                {isKbListLoading ? (
                                    <DropdownMenuItem disabled>{t('loadingKnowledgeBases')}</DropdownMenuItem>
                                ) : (
                                    <div className="flex">
                                        <div className="w-1/2 pr-2 border-r">
                                            <DropdownMenuLabel>{t('selectKnowledgeBase')}</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                        {availableKbs.length > 0 ? (
                                            availableKbs.map((kb) => (
                                                <DropdownMenuItem 
                                                    key={kb.id} 
                                                    onSelect={() => {
                                                        if (onKbSelectOnly) {
                                                            onKbSelectOnly(kb.id);
                                                        }
                                                    }}
                                                    className="flex items-center justify-between"
                                                >
                                                    <span>{kb.name}</span>
                                                    {selectedKbId === kb.id && (
                                                        <Check className="h-4 w-4 ml-2" />
                                                    )}
                                                </DropdownMenuItem>
                                            ))
                                        ) : (
                                            <DropdownMenuItem disabled>{t('noKnowledgeBases')}</DropdownMenuItem>
                                        )}
                                        </div>
                                        <div className="w-1/2 pl-2">
                                            <DropdownMenuLabel>{t('selectSearchMode')}</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="flex items-center justify-between" onSelect={() => onKbModeChange('vector')}>
                                                <span>{t('vectorSearch')}</span>
                                                {kbSearchMode === 'vector' && (
                                                    <Check className="h-4 w-4 ml-2" />
                                                )}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="flex items-center justify-between" onSelect={() => onKbModeChange('bm25')}>
                                                <span>{t('bm25Search')}</span>
                                                {kbSearchMode === 'bm25' && (
                                                    <Check className="h-4 w-4 ml-2" />
                                                )}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="flex items-center justify-between" onSelect={() => onKbModeChange('hybrid')}>
                                                <span>{t('hybridSearch')}</span>
                                                {kbSearchMode === 'hybrid' && (
                                                    <Check className="h-4 w-4 ml-2" />
                                                )}
                                            </DropdownMenuItem>
                                            {kbSearchMode === 'hybrid' && (
                                                <div className="flex flex-col gap-2 mt-2 w-full items-end">
                                                    <div className="w-full flex flex-col items-end">
                                                        <div className="flex items-center justify-between w-full mb-1">
                                                            <span className="text-xs text-muted-foreground">{t('bm25Weight')}</span>
                                                            <span className="text-xs text-muted-foreground">{t('vectorWeight')}</span>
                                                        </div>
                                                        <Slider
                                                            min={0}
                                                            max={1}
                                                            step={0.01}
                                                            value={[bm25Weight]}
                                                            onValueChange={([val]) => {
                                                                onKbModeWeightChange('bm25', val)
                                                                onKbModeWeightChange('vector', 1 - val)
                                                            }}
                                                            className="w-full"
                                                        />
                                                        <div className="flex justify-between w-full mt-1">
                                                            <span className="text-xs">{bm25Weight.toFixed(2)}</span>
                                                            <span className="text-xs">{(1 - bm25Weight).toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <ButtonGroupSeparator className="bg-white/30" />
                        <Button
                            type="button"
                            onClick={() => {
                                if (onKbSearchClick) {
                                    onKbSearchClick();
                                }
                            }}
                            disabled={isKbListLoading || disableInteractions || isSearchStrEmpty || !selectedKbId}
                            className="h-12 rounded-l-none rounded-r-lg border-0 bg-transparent text-white hover:bg-white/20 disabled:opacity-50 disabled:text-white/70 focus-visible:ring-0 focus-visible:ring-offset-0"
                        >
                            {isKbSearching ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Search className="h-5 w-5" />
                            )}
                        </Button>
                    </ButtonGroup>
                )}
            </div>
        </form>
    );
};

// --- Main Search Page Component ---
export default function SearchPage() {
    const { t } = useTranslate('search')
    const router = useRouter();
    const { data: session } = useSession();
    const [searchType, setSearchType] = useState<SearchType>('llm');
    
    // 用户配置状态
    const [availableSearchEngines, setAvailableSearchEngines] = useState<SearchEngineType[]>([]);
    const [availableLLMModels, setAvailableLLMModels] = useState<LlmModelType[]>([]);
    const [selectedSearchEngine, setSelectedSearchEngine] = useState<SearchEngineType | null>(null);
    const [selectedLLMModel, setSelectedLLMModel] = useState<LlmModelType | null>(null);
    const [isLoadingConfig, setIsLoadingConfig] = useState(true);

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
    } = useKnowledgeBaseContext();

    // 加载用户配置
    useEffect(() => {
        const loadUserConfig = async () => {
            if (!session?.user?.id) {
                setIsLoadingConfig(false);
                return;
            }

            try {
                // 加载搜索配置
                const searchConfigResult = await getUserSearchConfig();
                if (searchConfigResult.success && searchConfigResult.data) {
                    const engines: SearchEngineType[] = [];
                    if (searchConfigResult.data.hasJinaApiKey) {
                        engines.push('jina');
                    }if (searchConfigResult.data.hasTavilyApiKey) {
                        engines.push('tavily');
                    }
                    // DuckDuckGo 不需要 API Key，始终可用
                    engines.push('duckduckgo');
                    
                    setAvailableSearchEngines(engines);
                    // 设置默认搜索引擎（用户配置的）
                    const defaultEngine = searchConfigResult.data.searchProvider as SearchEngineType;
                    setSelectedSearchEngine(defaultEngine);
                }

                // 加载 LLM 配置
                const llmConfigResult = await getUserLLMConfigs();
                if (llmConfigResult.success && llmConfigResult.data) {
                    const models: LlmModelType[] = [];
                    const configs = llmConfigResult.data.configs;
                    
                    // 检查用户配置了哪些提供商
                    const providers = new Set(configs.map(c => c.provider));
                    if (providers.has('google')) {
                        models.push('gemini');
                    }
                    if (providers.has('openai')) {
                        models.push('gpt');
                    }
                    if (providers.has('deepseek')) {
                        models.push('deepseek');
                    }
                    
                    setAvailableLLMModels(models);
                    
                    // 设置默认模型（使用激活的配置）
                    if (llmConfigResult.data.activeConfig) {
                        const provider = llmConfigResult.data.activeConfig.provider;
                        if (provider === 'google') {
                            setSelectedLLMModel('gemini');
                        } else if (provider === 'openai') {
                            setSelectedLLMModel('gpt');
                        } else if (provider === 'deepseek') {
                            setSelectedLLMModel('deepseek');
                        }
                    } else if (models.length > 0) {
                        // 如果没有激活的配置，使用第一个可用的模型
                        setSelectedLLMModel(models[0]);
                    }
                }
            } catch (error) {
                console.error('加载用户配置失败:', error);
            } finally {
                setIsLoadingConfig(false);
            }
        };

        loadUserConfig();
    }, [session]);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        handleSearchStrChange(event);
    }

    const [isSubmitting, setIsSubmitting] = useState(false); // True during navigation attempt

    // --- Event Handlers (LLM, Web, KB, PubMed) --- 
    const handleLLMSelect = (model: LlmModelType) => {
        if (isSearchStrEmpty || isSubmitting || isPending) return;
        // 更新选中的模型
        setSelectedLLMModel(model);
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

    // 只选择模型，不触发搜索
    const handleModelSelectOnly = (model: LlmModelType) => {
        setSelectedLLMModel(model);
    };

    const handleWebEngineSelect = (engine: SearchEngineType) => {
        if (isSearchStrEmpty || isSubmitting || isPending) return;
        // 更新选中的搜索引擎
        setSelectedSearchEngine(engine);
        setIsSubmitting(true);
        try {
            const encodedQuery = encodeURIComponent(searchStr);
            router.push(`/search/web/${encodedQuery}?engine=${engine}`);
        } catch (e) {
            console.error("Navigation failed:", e);
            setIsSubmitting(false);
        }
    };

    // 只选择引擎，不触发搜索
    const handleEngineSelectOnly = (engine: SearchEngineType) => {
        setSelectedSearchEngine(engine);
    };

    const handleKbSelect = (kbId: string) => {
        if (isSearchStrEmpty || isSubmitting || isPending) return;
        // 更新选中的知识库
        setSelectedKbId(kbId);
        setIsSubmitting(true);
        try {
            const encodedQuery = encodeURIComponent(searchStr);
            router.push(`/search/kb/${encodedQuery}?kbId=${kbId}&mode=${kbSearchMode}`);
        } catch (e) {
            console.error("KB Navigation failed:", e);
            setIsSubmitting(false);
        }
    };

    // 只选择知识库，不触发搜索
    const handleKbSelectOnly = (kbId: string) => {
        setSelectedKbId(kbId);
    };

    // 知识库搜索按钮点击处理
    const handleKbSearchClick = () => {
        if (isSearchStrEmpty || isSubmitting || isPending || !selectedKbId) return;
        handleKbSelect(selectedKbId);
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

    const [kbSearchMode, setKbSearchMode] = useState<'vector' | 'bm25' | 'hybrid'>('vector');
    const [bm25Weight, setBm25Weight] = useState(0.5);
    const [vectorWeight, setVectorWeight] = useState(0.5);
    const [selectedKbId, setSelectedKbId] = useState<string | null>(null);

    const onKbModeChange = (mode: 'vector' | 'bm25' | 'hybrid') => {
        setKbSearchMode(mode);
    };

    const onKbModeWeightChange = (type: string, value: number) => {
        if (type === 'bm25') setBm25Weight(value);
        else setVectorWeight(value);
    };

    return (
        <main className={`flex min-h-screen flex-col items-center p-6 sm:p-10 md:p-16 bg-gradient-to-b from-background via-background to-muted/10 pt-24 sm:pt-20 justify-center`}>
            <div className="w-full max-w-3xl space-y-8">
                {/* Pass handleTabChange to Tabs component */}
                <Tabs value={searchType} onValueChange={handleTabChange} className="w-full">
                    <div className="text-center space-y-3 my-6 sm:my-8">
                        <h1 className="text-3xl sm:text-4xl font-bold bg-clip-text font-bold text-cyan-700 dark:text-cyan-300">
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
                                onKbSelectOnly={handleKbSelectOnly}
                                onKbSearchClick={handleKbSearchClick}
                                availableKbs={knowledgeBases.map(kb => ({ id: kb.id, name: kb.name || `KB ${kb.id}` }))}
                                t={t}
                                // Pass KB list loading state specifically for KB dropdown disabling
                                isKbListLoading={isKbListLoading}
                                kbSearchMode={kbSearchMode}
                                onKbModeChange={onKbModeChange}
                                bm25Weight={bm25Weight}
                                vectorWeight={vectorWeight}
                                onKbModeWeightChange={onKbModeWeightChange}
                                availableSearchEngines={availableSearchEngines}
                                availableLLMModels={availableLLMModels}
                                selectedSearchEngine={selectedSearchEngine}
                                selectedLLMModel={selectedLLMModel}
                                selectedKbId={selectedKbId}
                                isSubmitting={isSubmitting}
                                isPending={isPending}
                                onModelSelectOnly={handleModelSelectOnly}
                                onEngineSelectOnly={handleEngineSelectOnly}
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
                                            disabled={isSubmitting}
                                            className="h-12 text-base rounded-l-lg rounded-r-none border-r-0 border border-border/80 px-5 w-full focus-visible:ring-0 focus-visible:ring-offset-0"
                                        />
                                        <SearchSuggestions
                                            query={searchStr}
                                            onSuggestionClick={(suggestion) => {
                                                handleSearchStrChange({ target: { value: suggestion } } as React.ChangeEvent<HTMLInputElement>);
                                            }}
                                            className="top-full"
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting || isSearchStrEmpty}
                                        className="flex-shrink-0 h-12 rounded-l-none rounded-r-lg px-4 border-y border-border/80 bg-cyan-600 text-white hover:bg-cyan-700 transition-all focus-visible:ring-0 focus-visible:ring-offset-0"
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