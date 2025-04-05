import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslate } from '@/hooks/use-language';
import AdvancedSettingForm from './advanced-setting-form';
import BasicSettingForm from './basic-setting-form';


interface KnowledgeBaseSettingsProps {
    kbId: string;
}

export function KnowledgeBaseSettings({ kbId }: KnowledgeBaseSettingsProps) {
    const { t } = useTranslate('knowledgeBase');

    return (
        <ScrollArea className="h-[calc(100vh-4rem)]">
            <div className=" p-6 space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('settings.basicTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <BasicSettingForm />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('settings.advancedTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <AdvancedSettingForm />
                    </CardContent>
                </Card>
            </div>
        </ScrollArea>
    );
}
