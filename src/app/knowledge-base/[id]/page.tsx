'use client';

import { FileUploadDialog } from '@/components/file-upload-dialog';
import { Upload, Filter } from 'lucide-react';
import { KnowledgeBaseTable, KnowledgeBaseTableRef } from './components/knowledge-base-table';
import { KnowledgeBaseSettings } from './components/knowledge-base-settings/index';
import { useUploadDocument } from '@/hooks/use-document';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslate } from '@/hooks/use-language';
import { usePathname } from 'next/navigation';
import Sidebar from './components/sidebar';
import { useEffect, useRef, useState } from 'react';
import { use } from 'react';
import { cn } from '@/lib/utils';

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

type ViewType = 'files' | 'settings';

export default function KnowledgeBasePage({ params }: PageProps) {
    const resolvedParams = use(params);
    const [currentView, setCurrentView] = useState<ViewType>('files');
    const tableRef = useRef<KnowledgeBaseTableRef>(null);
    const {
        documentUploadVisible,
        hideDocumentUploadModal,
        showDocumentUploadModal,
        onDocumentUploadOk,
        documentUploadLoading,
    } = useUploadDocument(resolvedParams.id || '');

    const { t } = useTranslate('knowledgeBase');
    const pathname = usePathname();

    useEffect(() => {
        // 根据路径设置初始视图
        if (pathname.includes('/settings')) {
            setCurrentView('settings');
        } else {
            setCurrentView('files');
        }
    }, [pathname]);

    const handleSidebarSelect = (type: ViewType) => {
        setCurrentView(type);
    };

    const handleUploadFile = async (file: File) => {
        const result = await onDocumentUploadOk(file);
        if (result?.success) {
            // 上传成功后刷新表格
            tableRef.current?.refresh();
        }
        // 错误处理和关闭模态框已在 useUploadDocument hook 中完成
    };

    if (!resolvedParams.id) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center h-32">
                    <p className="text-muted-foreground">{t('noDatasetId')}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="flex min-h-screen relative">
            {/* 侧边栏 - 大屏幕固定，小屏幕可切换 */}
            <div className="hidden lg:block w-64">
                <Sidebar
                    className="h-full"
                    onSelect={handleSidebarSelect}
                    currentView={currentView}
                    kbId={resolvedParams.id}
                />
            </div>
            {/* 主内容区 - 自适应宽度 */}
            <div className="flex-1 w-full lg:w-[calc(100%-16rem)]">
                <div className="space-y-6 p-4 lg:p-8">
                    <Card className={cn("border-none shadow-none")}>
                        <CardHeader className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0 pb-2">
                            <CardTitle className="text-xl lg:text-2xl font-bold">
                                {currentView === 'settings' ? t('settings.title') : t('files')}
                            </CardTitle>
                            {currentView === 'files' && (
                                <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-2 lg:space-y-0 lg:space-x-2 w-full lg:w-auto">
                                    <div className="relative w-full lg:w-[200px]">
                                        <Filter className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            placeholder={t('searchFiles')}
                                            className="w-full lg:w-[200px] pl-8"
                                        />
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={showDocumentUploadModal}
                                        className="w-full lg:w-auto"
                                    >
                                        <Upload className="mr-2 h-4 w-4" />
                                        {t('uploadFile')}
                                    </Button>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent>
                            {currentView === 'settings' ? (
                                <KnowledgeBaseSettings kbId={resolvedParams.id} />
                            ) : (
                                <KnowledgeBaseTable ref={tableRef} kbId={resolvedParams.id} />
                            )}
                        </CardContent>
                    </Card>
                    {currentView === 'files' && documentUploadVisible && (
                        <FileUploadDialog
                            hideModal={hideDocumentUploadModal}
                            onOk={handleUploadFile}
                            loading={documentUploadLoading}
                            kbId={resolvedParams.id}
                        />
                    )}
                </div>
            </div>
        </div>
    );
} 