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
import { useTranslate } from '@/hooks/use-language';
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
      {imageList.length > 0 ? (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">
              "{item.title}" {t('docParser.methodTitle')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {item.description}
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">
              "{item.title}" {t('docParser.methodExamples')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">{t('docParser.methodExamplesDescription')}</p>
            <div className="grid grid-cols-2 gap-4">
              {imageList.map((x: string) => (
                <div key={x} className="relative aspect-[4/3]">
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

          <div>
            <h3 className="text-lg font-semibold mb-2">
              {item.title} {t('docParser.dialogueExamplesTitle')}
            </h3>
            <Separator />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <p className="text-sm text-muted-foreground">{t('docParser.methodEmpty')}</p>
          <div className="relative w-full max-w-md aspect-[16/9]">
            <Image
              src="/assets/svg/chunk-method/chunk-empty.svg"
              fill
              className="object-contain"
              alt="chunk-empty"
            />
          </div>
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
