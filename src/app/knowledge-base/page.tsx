'use client';

import React from 'react';
import { useInfiniteFetchKnowledgeList, useSaveKnowledge } from '@/hooks/use-knowledge-base';
import { useFetchUserInfo } from '@/hooks/use-user';
import { useTranslation } from 'react-i18next';
import KnowledgeBaseCard from './components/knowledge-base-card';
import { useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useState } from "react";

// Shadcn UI 组件导入
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import CreateKnowledgeBaseDialog from './components/create-knowledge-base-dialog';
export default function KnowledgeBaseList() {
    const { data: userInfo } = useFetchUserInfo();
    const { t } = useTranslation('translation', { keyPrefix: 'knowledgeBase' });
    const {
        visible,
        hideDialog,
        showDialog,
        onCreateOk,
        loading: creatingLoading,
    } = useSaveKnowledge();
    const {
        fetchNextPage,
        data,
        hasNextPage,
        searchString,
        handleInputChange,
        loading,
        scrollRef,
    } = useInfiniteFetchKnowledgeList();
    const [dialogOpen, setDialogOpen] = useState(false);

    const nextList = useMemo(() => {
        return data ?? [];
    }, [data]);

    const total = useMemo(() => {
        return data?.length ?? 0;
    }, [data]);

    const handleCreateKnowledgeBase = (name: string) => {
        // TODO: 实现创建知识库的逻辑
        console.log('Create knowledge base:', name);
    };

    return (
        <div className="flex flex-col py-12 flex-1">
            <div className="flex justify-between items-start px-[60px] pb-[72px]">
                <div>
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

                    <Button
                        onClick={() => setDialogOpen(true)}
                        className="font-inter text-sm font-semibold leading-5 px-2"
                    >
                        <Plus className="mr-1 h-4 w-4" />
                        {t('create')}
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
            <CreateKnowledgeBaseDialog
                visible={dialogOpen}
                hideDialog={() => setDialogOpen(false)}
                loading={creatingLoading}
                onOk={handleCreateKnowledgeBase}
            />
        </div>
    );
}; 