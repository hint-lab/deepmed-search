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
import Sidebar from './components/sidebar';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useParams, useSearchParams } from 'next/navigation';

// 定义视图类型
type ViewType = 'files' | 'settings';

/**
 * 知识库详情页面组件
 * 支持文件列表和设置两种视图模式
 */
export default function KnowledgeBasePage() {
    // 解析路由参数
    const params = useParams();
    const id = params?.id as string;
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab'); // 'settings' 或 'documents'

    // 当前视图状态：文件列表或设置
    const [currentView, setCurrentView] = useState<ViewType>(tab as ViewType);
    // 表格组件的引用，用于刷新数据
    const tableRef = useRef<KnowledgeBaseTableRef>(null);

    // 使用文档上传相关的hook
    const {
        documentUploadVisible,    // 上传对话框显示状态
        hideDocumentUploadModal,  // 隐藏上传对话框
        showDocumentUploadModal,  // 显示上传对话框
        onDocumentUploadOk,       // 处理文件上传确认
        documentUploadLoading,    // 上传加载状态
    } = useUploadDocument(id);

    // 使用多语言翻译hook
    const { t } = useTranslate('knowledgeBase');

    /**
     * 处理侧边栏选择事件
     * @param type 选择的视图类型
     */
    const handleSidebarSelect = (type: ViewType) => {
        setCurrentView(type);
    };

    /**
     * 处理文件上传
     * @param file 要上传的文件
     */
    const handleUploadFile = async (file: File) => {
        const result = await onDocumentUploadOk(file);
        if (result?.success) {
            // 上传成功后刷新表格数据
            tableRef.current?.refresh();
        }
        // 错误处理和关闭模态框已在 useUploadDocument hook 中完成
    };

    // 如果没有知识库ID，显示错误提示
    if (!id) {
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
            {/* 侧边栏 - 大屏幕固定显示，小屏幕可切换 */}
            <div className="hidden lg:block w-64">
                <Sidebar
                    className="h-full"
                    onSelect={handleSidebarSelect}
                    currentView={currentView}
                    kbId={id}
                />
            </div>
            {/* 主内容区域 - 自适应宽度 */}
            <div className="flex-1 w-full lg:w-[calc(100%-16rem)] pt-2 ">
                <div className="space-y-6 p-4 lg:p-8">
                    {/* 主要内容卡片 */}
                    <Card className={cn("border-none shadow-none mt-6 bg-transparent")}>
                        <CardHeader className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0 pb-2 ">
                            {/* 标题区域 */}
                            <CardTitle className="text-xl lg:text-2xl font-bold">
                                {currentView === 'settings' ? t('settings.title') : t('files')}
                            </CardTitle>
                            {/* 文件视图下的操作按钮区域 */}
                            {currentView === 'files' && (
                                <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-2 lg:space-y-0 lg:space-x-2 w-full lg:w-auto">
                                    {/* 搜索输入框 */}
                                    <div className="relative w-full lg:w-[200px]">
                                        <Filter className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            placeholder={t('searchFiles')}
                                            className="w-full lg:w-[200px] pl-8"
                                        />
                                    </div>
                                    {/* 上传文件按钮 */}
                                    <Button
                                        variant="default"
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
                            {/* 根据当前视图显示不同的内容 */}
                            {currentView === 'settings' ? (
                                <KnowledgeBaseSettings kbId={id} />
                            ) : (
                                <KnowledgeBaseTable ref={tableRef} kbId={id} />
                            )}
                        </CardContent>
                    </Card>
                    {/* 文件上传对话框 */}
                    {currentView === 'files' && documentUploadVisible && (
                        <FileUploadDialog
                            hideModal={hideDocumentUploadModal}
                            onOk={handleUploadFile}
                            loading={documentUploadLoading}
                            kbId={id}
                        />
                    )}
                </div>
            </div>
        </div>
    );
} 