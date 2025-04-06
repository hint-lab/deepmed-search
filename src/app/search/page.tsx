"use client"

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
        <div className="container mx-auto py-8 px-4 mt-20 pt-20">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold mb-4">{t("title", "医疗知识搜索")}</h1>
                <p className="text-muted-foreground mb-8">
                    {t("description", "使用向量搜索快速找到相关的医疗信息和文档")}
                </p>
                <div className="bg-card/50 rounded-xl p-6">
                    <VectorSearch />
                </div>
                <div className="mt-8">
                    <h2 className="text-xl font-semibold mb-4">{t("searchTips", "搜索技巧")}</h2>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                        <li>{t("tip1", "使用具体的医疗术语")}</li>
                        <li>{t("tip2", "直接描述你的问题")}</li>
                        <li>{t("tip3", "描述症状以找到相关信息")}</li>
                    </ul>
                </div>
            </div>
        </div>
    )
} 