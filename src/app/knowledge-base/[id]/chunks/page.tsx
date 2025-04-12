'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslate } from '@/hooks/use-language';
import { ChunkList } from '@/components/chunk-list';
import { ChunkSettings } from '@/components/chunk-settings';

/**
 * 文档分块页面组件
 * 支持文件列表和设置两种视图模式
 */
export default function DocumentChunksPage() {
    const { id } = useParams();
    const { t } = useTranslate('knowledge');
    const [activeTab, setActiveTab] = useState('files');

    return (
        <div className="container mx-auto py-6">
            <h1 className="text-2xl font-bold mb-6">{t('chunks')}</h1>

            <Tabs defaultValue="table" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                    <TabsTrigger value="table">{t('documentTable')}</TabsTrigger>
                    <TabsTrigger value="settings">{t('settings')}</TabsTrigger>
                </TabsList>

                <TabsContent value="table">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('documentTable')}</CardTitle>
                            <CardDescription>{t('documentTableDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChunkList knowledgeBaseId={id as string} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="settings">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('chunkSettings')}</CardTitle>
                            <CardDescription>{t('chunkSettingsDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChunkSettings knowledgeBaseId={id as string} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
