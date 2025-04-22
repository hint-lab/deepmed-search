"use client"

import React, { useState, useEffect } from 'react';
import { useTranslate } from '@/hooks/use-language';
import { KnowledgeBaseCard } from './components/kb-card';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUser } from '@/contexts/user-context';
import { useKnowledgeBase } from '@/contexts/knowledgebase-context';
import CreateKnowledgeBaseButton from './components/create-button';
import { IKnowledgeBase } from '@/types/knowledgebase';

export default function KnowledgeBaseListPage() {
    const { t } = useTranslate('knowledgeBase');
    const { userInfo } = useUser();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [searchString, setSearchString] = useState('');
    const {
        knowledgeBases,
        isLoading,
        isCreating,
        fetchKnowledgeBases
    } = useKnowledgeBase();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchString(e.target.value);
    };

    const filteredKnowledgeBases = knowledgeBases.filter(kb =>
        kb.name.toLowerCase().includes(searchString.toLowerCase())
    );
    useEffect(() => {
        fetchKnowledgeBases();
    }, []);
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
                                onChange={handleInputChange}
                            />
                        </div>
                        <Button onClick={() => setDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t("create")}
                        </Button>
                    </div>
                </div>
                {isLoading ? (
                    <div className="space-y-2 px-[60px]">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                ) : (
                    <ScrollArea className="h-[calc(100vh-200px)]">
                        <div className="flex flex-wrap gap-6 px-[60px]">
                            {filteredKnowledgeBases.length > 0 ? (
                                filteredKnowledgeBases.map((item: IKnowledgeBase) => (
                                    <KnowledgeBaseCard
                                        item={item}
                                        key={item.id}
                                    />
                                ))
                            ) : (
                                <div className="w-full flex items-center justify-center py-10">
                                    <div className="text-center">
                                        <p className="text-muted-foreground">{t('noData')}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                )}
            </div>
            <CreateKnowledgeBaseButton
                visible={dialogOpen}
                hideDialog={() => setDialogOpen(false)}
            />
        </div>
    );
}