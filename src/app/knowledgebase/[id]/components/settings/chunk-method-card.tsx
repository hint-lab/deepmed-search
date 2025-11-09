import { Card, CardContent } from '@/components/ui/card';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslate } from '@/contexts/language-context';
import { useSelectParserList, ParserItem } from '@/hooks/use-user-setting';
import camelCase from 'lodash/camelCase';
import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { ImageMap } from './utils';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';

const CategoryPanel = ({ chunkMethod }: { chunkMethod: string }) => {
  const parserList = useSelectParserList();
  const { t } = useTranslate('knowledgeBase');

  const item = useMemo(() => {
    const item = parserList.find((x: ParserItem) => x.value === chunkMethod);
    if (item) {
      return {
        title: item.label,
        description: t(camelCase(item.value)),
      };
    }
    return { title: '', description: '' };
  }, [parserList, chunkMethod, t]);

  const imageList = useMemo(() => {
    if (chunkMethod in ImageMap) {
      return ImageMap[chunkMethod as keyof typeof ImageMap];
    }
    return [];
  }, [chunkMethod]);

  return (
    <section className="flex-1 pl-8">
      {chunkMethod && item.title ? (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-100">
                  {item.title}
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          </div>

          {imageList.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">
                {t('docParser.methodExamples')}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">{t('docParser.methodExamplesDescription')}</p>
              <div className="grid grid-cols-2 gap-4">
                {imageList.map((x: string) => (
                  <div key={x} className="relative aspect-[4/3] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <Image
                      src={`/assets/svg/chunk-method/${x}.png`}
                      fill
                      className="object-contain"
                      alt={x}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full min-h-[300px] space-y-4">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-base font-medium text-gray-600 dark:text-gray-400">{t('docParser.methodEmpty')}</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 text-center max-w-md">
            {t('docParser.methodExamplesDescription')}
          </p>
        </div>
      )}
    </section>
  );
};

export default function ChunkMethodCard() {
  const { t } = useTranslate('knowledgeBase');
  const form = useFormContext();
  const parserList = useSelectParserList();

  return (
    <Card className="mb-6">
      <CardContent className="flex pt-6">
        <div className="w-1/3">
          <FormField
            control={form.control}
            name="parser_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('chunkMethod')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectChunkMethod')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {parserList.map((item: ParserItem) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <CategoryPanel chunkMethod={form.watch('parser_id')} />
      </CardContent>
    </Card>
  );
}
