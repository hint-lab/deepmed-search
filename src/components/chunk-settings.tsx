'use client';

import { useState } from 'react';
import { useTranslate } from '@/contexts/language-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

interface ChunkSettingsProps {
    knowledgeBaseId: string;
}

export function ChunkSettings({ knowledgeBaseId }: ChunkSettingsProps) {
    const { t } = useTranslate('knowledge');
    const [chunkSize, setChunkSize] = useState(500);
    const [chunkOverlap, setChunkOverlap] = useState(50);
    const [autoProcess, setAutoProcess] = useState(true);

    const handleSave = async () => {
        try {
            // 这里应该是实际的API调用
            // await fetch(`/api/knowledgebase/${knowledgeBaseId}/settings`, {
            //   method: 'PUT',
            //   headers: {
            //     'Content-Type': 'application/json',
            //   },
            //   body: JSON.stringify({
            //     chunkSize,
            //     chunkOverlap,
            //     autoProcess,
            //   }),
            // });

            console.log('设置已保存');
        } catch (error) {
            console.error('保存设置失败:', error);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>{t('chunkSettings')}</CardTitle>
                    <CardDescription>
                        {t('chunkSettingsDescription')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('chunkSize')}</Label>
                            <div className="flex items-center space-x-4">
                                <Slider
                                    value={[chunkSize]}
                                    onValueChange={(value) => setChunkSize(value[0])}
                                    min={100}
                                    max={1000}
                                    step={50}
                                    className="flex-1"
                                />
                                <span className="w-12 text-right">{chunkSize}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {t('chunkSizeDescription')}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('chunkOverlap')}</Label>
                            <div className="flex items-center space-x-4">
                                <Slider
                                    value={[chunkOverlap]}
                                    onValueChange={(value) => setChunkOverlap(value[0])}
                                    min={0}
                                    max={200}
                                    step={10}
                                    className="flex-1"
                                />
                                <span className="w-12 text-right">{chunkOverlap}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {t('chunkOverlapDescription')}
                            </p>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>{t('autoProcess')}</Label>
                                <p className="text-sm text-muted-foreground">
                                    {t('autoProcessDescription')}
                                </p>
                            </div>
                            <Switch
                                checked={autoProcess}
                                onCheckedChange={setAutoProcess}
                            />
                        </div>
                    </div>

                    <Button onClick={handleSave} className="w-full">
                        {t('saveSettings')}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
} 