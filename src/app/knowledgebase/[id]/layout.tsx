'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useKnowledgeBaseContext } from '@/contexts/knowledgebase-context';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslate } from '@/contexts/language-context';
import Sidebar from './components/sidebar';

// 定义布局组件的 Props 类型
interface KnowledgeBaseLayoutProps {
    children: React.ReactNode; // 子组件内容
}

export default function KnowledgeBaseLayout({ children }: KnowledgeBaseLayoutProps) {
    const params = useParams();
    const { t } = useTranslate('knowledgeBase');
    const { currentView, setCurrentView, setCurrentKnowledgeBaseId } = useKnowledgeBaseContext();
    const kbId = params?.id as string;

    // 在布局组件中处理初始视图设置
    useEffect(() => {
        setCurrentKnowledgeBaseId(kbId);
        // 获取当前kb
    }, []);

    // 如果没有知识库 ID，显示错误提示
    if (!kbId) {
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
            {/* 侧边栏 */}
            <div className="hidden lg:block w-64 border-r">
                <Sidebar
                    className="h-full"
                    onSelect={setCurrentView}
                    currentView={currentView} // 使用 Context 中的视图
                />
            </div>
            {/* 主内容区域 */}
            <div className="flex-1 w-full lg:w-[calc(100%-16rem)] py-2">
                {/* 渲染子页面内容 */}
                {children}
            </div>
        </div>
    );
} 