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

import { IReference } from "@/types/db/chat"
import { isEmpty } from "lodash"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export default function SearchPage() {
    const { t } = useTranslation()
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
        <div className="flex h-screen">
            <SearchSidebar
                isFirstRender={isFirstRender}
                checkedList={checkedList}
                setCheckedList={setCheckedList}
            />

            <div className={cn(
                "flex-1 overflow-auto",
                isFirstRender ? "flex mt-36 justify-center" : "p-6"
            )}>
                <div className="mx-auto max-w-5xl space-y-6">
                    {isFirstRender ? (
                        <div className="text-center space-y-4">
                            <h1 className="text-3xl font-bold">{t("search.title")}</h1>
                            <p className="text-muted-foreground">{t("search.searchDescription")}</p>
                            <div className="w-[600px]">
                                <div className="flex items-center space-x-2">
                                    <Input
                                        value={searchStr}
                                        onChange={handleSearchStrChange}
                                        placeholder={t("search.searchPlaceholder")}
                                        className="h-10"
                                    />
                                    <Button variant="outline" size="icon" onClick={handleSearch}>
                                        <Search className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="sticky top-0 z-50">
                                <div className="flex items-center space-x-2">
                                    <Input
                                        value={searchStr}
                                        onChange={handleSearchStrChange}
                                        placeholder={t("search.searchPlaceholder")}
                                        className="h-10"
                                    />
                                    {sendingLoading ? (
                                        <Button variant="outline" size="icon" onClick={stopOutputMessage}>
                                            <CircleStop className="h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <Button variant="outline" size="icon" onClick={handleSearch}>
                                            <SendHorizontal className="h-4 w-4 " />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center space-x-2">
                                        <img src="/logo.svg" alt="" className="h-5 w-5" />
                                        <span>{t("chat.answerTitle")}</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {isEmpty(answer) && sendingLoading ? (
                                        <div className="space-y-4">
                                            <Skeleton className="h-32" />
                                            <p className="text-muted-foreground text-center">正在思考中...</p>
                                        </div>
                                    ) : (
                                        answer.answer && (
                                            <MarkdownContent
                                                loading={sendingLoading}
                                                content={answer.answer}
                                                reference={answer.reference ?? ({} as IReference)}
                                            />
                                        )
                                    )}
                                </CardContent>
                            </Card>

                            <Separator />

                            <RetrievalDocuments
                                selectedDocumentIds={selectedDocumentIds}
                                setSelectedDocumentIds={setSelectedDocumentIds}
                                onTesting={handleTestChunk}
                            />

                            <Separator />

                            {relatedQuestions?.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t("chat.relatedQuestion")}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground mb-4">您可能还想了解以下问题：</p>
                                        <div className="flex flex-wrap gap-2">
                                            {relatedQuestions?.map((question: string, idx: number) => (
                                                <Badge
                                                    key={idx}
                                                    variant="secondary"
                                                    className="cursor-pointer hover:bg-secondary/80"
                                                    onClick={handleClickRelatedQuestion(question)}
                                                >
                                                    {question}
                                                </Badge>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    )}
                </div>
            </div>

            {!isFirstRender && !isSearchStrEmpty && !isEmpty(checkedList) && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                className="fixed right-8 top-1/4 h-12 w-12"
                                onClick={showMindMapModal}
                            >
                                <svg
                                    className="h-6 w-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                    />
                                </svg>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{t("chunk.mind")}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        </div>
    )
} 