'use client';

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTranslation } from "react-i18next"
import { CircleStop, SendHorizontal, Search } from "lucide-react"
import { useState } from "react"
import { useSendQuestion } from "@/hooks/use-search"
import SearchSidebar from "./components/search-sidebar"
import MarkdownContent from "@/components/markdown-content"
import RetrievalDocuments from "./components/retrieval-documents"
import { Badge } from "@/components/ui/badge"
import { VectorSearch } from '@/components/search-vector'
import { useTranslate } from '@/hooks/use-language'

import { IReference } from "@/types/db/chat"
import { isEmpty } from "lodash"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export default function SearchPage() {
    const { t } = useTranslate('search')
    const [checkedList, setCheckedList] = useState<string[]>([])
    const [isFirstRender, setIsFirstRender] = useState(true)
    const [mindMapVisible, setMindMapVisible] = useState(false)
    const [mindMap, setMindMap] = useState<any>(null)
    const [mindMapLoading, setMindMapLoading] = useState(false)

    const {
        sendQuestion,
        handleClickRelatedQuestion,
        handleSearchStrChange,
        handleTestChunk,
        setSelectedDocumentIds,
        answer,
        sendingLoading,
        relatedQuestions,
        searchStr,
        loading,
        selectedDocumentIds,
        isSearchStrEmpty,
        stopOutputMessage,
    } = useSendQuestion(checkedList)

    const showMindMapModal = () => setMindMapVisible(true)
    const hideMindMapModal = () => setMindMapVisible(false)

    const handleSearch = () => {
        sendQuestion(searchStr)
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-2xl font-bold mb-8 text-center">
                    {t('title', '医疗知识搜索')}
                </h1>
                <p className="text-muted-foreground mb-8 text-center">
                    {t('description', '使用向量搜索快速找到相关的医疗信息和文档')}
                </p>

                <VectorSearch />

                <div className="mt-12 text-sm text-muted-foreground">
                    <h2 className="font-medium mb-2">{t('tips.title', '搜索提示')}</h2>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>{t('tips.specific', '使用具体的医学术语获得更准确的结果')}</li>
                        <li>{t('tips.question', '可以直接提问，如"什么是2型糖尿病？"')}</li>
                        <li>{t('tips.symptoms', '描述症状以找到相关疾病信息')}</li>
                    </ul>
                </div>
            </div>
        </div>
    )
} 