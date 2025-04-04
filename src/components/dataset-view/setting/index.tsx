import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import AdvancedSettingForm from './advanced-setting-form';
import BasicSettingForm from './basic-setting-form';

export default function DatasetSettings() {
  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <div className="container p-6 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>基础设置</CardTitle>
          </CardHeader>
          <CardContent>
            <BasicSettingForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>高级设置</CardTitle>
          </CardHeader>
          <CardContent>
            <AdvancedSettingForm />
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
