"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslate } from '@/hooks/use-language';
import { KnowledgeBaseCard } from './components/knowledge-base-card';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import CreateKnowledgeBaseDialog from './components/create-knowledge-base-dialog';
import { toast } from 'sonner';
import { useUser } from '@/contexts/user-context';
import { useFetchKnowledgeBaseListWithPagination, useCreateKnowledgeBase } from '@/hooks/use-knowledge-base'
import { useRouter } from "next/navigation";
import { getAllInvisibleKnowledgeBasesAction } from '@/actions/knowledgebase';

export default function KnowledgeBaseListPage() {
    const router = useRouter();
    const { t } = useTranslate('knowledgeBase');
    const { userInfo } = useUser();
    const {
        list,
        fetchNextPage,
        hasNextPage,
        searchString,
        handleInputChange,
        loading,
        scrollRef,
    } = useFetchKnowledgeBaseListWithPagination();
    const { createKnowledgeBase, loading: createLoading } = useCreateKnowledgeBase();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [creatingLoading, setCreatingLoading] = useState(false);

    const nextList = list;

    const total = useMemo(() => {
        return list?.length ?? 0;
    }, [list]);

    return (
        <div className="container mx-auto py-8">
            <div className="flex flex-col py-12 pt-14 flex-1">
                <div className="flex justify-between items-start px-[60px] p-[72px]">
                    <div className='flex flex-col space-y-2 pl-2'>
                        <span className="font-inter text-[30px] font-semibold leading-[38px] text-primary">
                            {t('welcome')}, {userInfo?.name || t('guest')}
                        </span>
                        <p className="font-inter text-base font-normal leading-6">
                            {t('description')}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder={t('searchKnowledgePlaceholder')}
                                value={searchString}
                                className="w-[220px] pl-8"
                                onChange={(e) => handleInputChange(e)}
                            />
                        </div>
                        <Button onClick={() => setDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t("create")}
                        </Button>
                    </div>
                </div>
                {loading ? (
                    <div className="space-y-2 px-[60px]">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                ) : (
                    <ScrollArea ref={scrollRef} className="h-[calc(100vh-200px)]">
                        <div className="flex flex-wrap gap-6 px-[60px]">
                            {nextList?.length > 0 ? (
                                nextList.map((item: any, index: number) => (
                                    <KnowledgeBaseCard
                                        item={item}
                                        key={`${item?.name}-${index}`}
                                    />
                                ))
                            ) : (
                                <div className="w-full flex items-center justify-center py-10">
                                    <div className="text-center">
                                        <p className="text-muted-foreground">{t('noData')}</p>
                                    </div>
                                </div>
                            )}
                            {hasNextPage && (
                                <div className="space-y-2 w-full">
                                    <Skeleton className="h-12 w-full" />
                                </div>
                            )}
                            {!!total && !hasNextPage && (
                                <div className="flex items-center justify-center py-4 w-full">
                                    <Separator className="flex-grow" />
                                    <span className="flex whitespace-nowrap mx-4 text-sm text-muted-foreground">{t('noMoreData')} 🤐</span>
                                    <Separator className="flex-grow" />
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                )}
            </div>
            <CreateKnowledgeBaseDialog
                visible={dialogOpen}
                hideDialog={() => setDialogOpen(false)}
                loading={creatingLoading}
                onOk={createKnowledgeBase}
            />
        </div>
    );
} 