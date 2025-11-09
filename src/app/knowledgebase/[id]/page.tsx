'use client';

import { Filter } from 'lucide-react';
import { KnowledgeBaseTable, KnowledgeBaseTableRef } from './components/table';
import { KnowledgeBaseSettings } from './components/settings';
import { SearchSnippetPage } from './components/search-snippet-page';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslate } from '@/contexts/language-context';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useParams } from 'next/navigation';
import { DocumentUploadButton } from './components/upload-button';
import { useKnowledgeBaseContext } from '@/contexts/knowledgebase-context';
import { useDebounce } from '@/hooks/use-debounce';

/**
 * 知识库详情页面组件
 * 支持文件列表和设置两种视图模式
 */
export default function KnowledgeBasePage() {
    const params = useParams();
    const { currentView, currentKnowledgeBase, isLoadingCurrent } = useKnowledgeBaseContext();
    const kbId = params?.id as string;
    const tableRef = useRef<KnowledgeBaseTableRef>(null);
    const { t } = useTranslate('knowledgeBase');
    const [searchString, setSearchString] = useState('');
    const debouncedSearch = useDebounce(searchString, 400);
    const hasTriggeredSearch = useRef(false);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchString(e.target.value);
    };

    useEffect(() => {
        if (!tableRef.current) return;
        if (!hasTriggeredSearch.current) {
            hasTriggeredSearch.current = true;
            return;
        }
        tableRef.current.search(debouncedSearch);
    }, [debouncedSearch]);

    if (isLoadingCurrent) {
        return null;
    }

    if (!kbId || !currentKnowledgeBase) {
        return null;
    }

    return (
        <div className="space-y-6 p-4 lg:p-8">
            <Card className={cn("border-none shadow-none mt-6 bg-transparent")}>
                <CardHeader className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0 pb-2 ">
                    <CardTitle className="text-xl lg:text-2xl font-bold">
                        {currentView === 'settings' 
                            ? t('settings.title') 
                            : currentView === 'snippets'
                            ? t('snippetSearch.title')
                            : t('documentTable')}
                    </CardTitle>
                    {currentView === 'table' && (
                        <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-2 lg:space-y-0 lg:space-x-2 w-full lg:w-auto">
                            <div className="relative w-full lg:w-[200px]">
                                <Filter className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder={t('searchFiles')}
                                    className="w-full lg:w-[200px] pl-8"
                                    value={searchString}
                                    onChange={handleSearchChange}
                                />
                            </div>
                            <DocumentUploadButton
                                kbId={kbId}
                                onSuccess={() => {
                                    tableRef.current?.refresh();
                                }}
                                onError={() => { /* 添加错误处理逻辑 */ }}
                                disabled={false} // 或根据逻辑设置
                                className="w-full lg:w-auto"
                            />
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    {currentView === 'settings' ? (
                        <KnowledgeBaseSettings kbId={kbId} />
                    ) : currentView === 'snippets' ? (
                        <SearchSnippetPage kbId={kbId} />
                    ) : (
                        <KnowledgeBaseTable
                            ref={tableRef}
                            kbId={kbId}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}