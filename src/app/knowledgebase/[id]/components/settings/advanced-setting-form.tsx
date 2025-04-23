'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useTranslate } from '@/hooks/use-language';
import { useKnowledgeBase } from '@/contexts/knowledgebase-context';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import ChunkMethodCard from './chunk-method-card';
import { Badge } from '@/components/ui/badge';

export default function AdvancedSettingForm() {
  const { t } = useTranslate('knowledgeBase');
  const { currentKnowledgeBase, updateKnowledgeBase } = useKnowledgeBase();

  const formSchema = z.object({
    parser_id: z.string().min(1, {
      message: t('validation.parserRequired'),
    }),
    chunk_size: z.number().min(100).max(2000),
    chunk_overlap: z.number().min(0).max(1000),
    separators: z.array(z.string()).min(1, {
      message: t('validation.separatorRequired', '至少需要一个分隔符'),
    }),
    custom_rules: z.string(),
  });

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      parser_id: '',
      chunk_size: 500,
      chunk_overlap: 100,
      separators: [],
      custom_rules: '',
    },
  });

  useEffect(() => {
    const defaultSeparators = ['. ', '! ', '? ', '。', '！', '？', '；', ';', '\n'];

    if (currentKnowledgeBase?.parser_config) {
      const config = currentKnowledgeBase.parser_config as any;
      let loadedSeparators: string[] = [];
      if (typeof config?.separator === 'string' && config.separator.trim() !== '') {
        loadedSeparators = [config.separator];
      } else if (Array.isArray(config?.separators)) {
        loadedSeparators = config.separators;
      }

      const initialSeparators = Array.from(new Set([...defaultSeparators, ...loadedSeparators]));

      form.reset({
        parser_id: config?.parser_id || '',
        chunk_size: config?.chunk_size ?? 500,
        chunk_overlap: config?.chunk_overlap ?? 100,
        separators: initialSeparators.length > 0 ? initialSeparators : defaultSeparators,
        custom_rules: config?.custom_rules || '',
      });
    } else {
      form.reset({
        ...form.getValues(),
        separators: defaultSeparators,
      });
    }
  }, [currentKnowledgeBase, form.reset]);

  function onSubmit(values: FormValues) {
    console.log("Submitting separators:", values.separators);
    if (!currentKnowledgeBase?.id) {
      toast.error("知识库ID不存在");
      return;
    }
    updateKnowledgeBase(
      currentKnowledgeBase?.id,
      currentKnowledgeBase?.name,
      currentKnowledgeBase?.description || '',
      currentKnowledgeBase?.language || '',
      values.chunk_size,
      values.chunk_overlap,
      false,
      values.separators,
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* <ChunkMethodCard /> */}

        <FormField
          control={form.control}
          name="chunk_size"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.chunkSize')} - 当前值: {field.value}</FormLabel>
              <FormControl>
                <Slider
                  min={100}
                  max={2000}
                  step={100}
                  value={[field.value]}
                  onValueChange={(value: number[]) => field.onChange(value[0])}
                />
              </FormControl>
              <FormDescription>
                {t('form.chunkSizeDescription')} (100-2000)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="chunk_overlap"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.chunkOverlap')} - 当前值: {field.value}</FormLabel>
              <FormControl>
                <Slider
                  min={0}
                  max={form.watch('chunk_size') / 2 || 1000}
                  step={50}
                  value={[field.value]}
                  onValueChange={(value: number[]) => {
                    const chunkSize = form.getValues('chunk_size');
                    if (value[0] <= chunkSize / 2) {
                      field.onChange(value[0]);
                    } else {
                      field.onChange(Math.floor(chunkSize / 2));
                    }
                  }}
                />
              </FormControl>
              <FormDescription>
                {t('form.chunkOverlapDescription')} (100-{form.watch('chunk_size') / 2})
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="separators"
          render={({ field }) => {
            const [newSeparator, setNewSeparator] = useState('');

            const handleAddSeparator = () => {
              const trimmedSeparator = newSeparator.trim();
              if (trimmedSeparator && !field.value.includes(trimmedSeparator)) {
                field.onChange([...field.value, trimmedSeparator]);
                setNewSeparator('');
              } else if (field.value.includes(trimmedSeparator)) {
                toast.info("分隔符已存在");
              }
            };

            const handleRemoveSeparator = (separatorToRemove: string) => {
              if (field.value.length <= 1) {
                toast.warning(t('validation.separatorRequired', '至少需要一个分隔符'));
                return;
              }
              field.onChange(field.value.filter(sep => sep !== separatorToRemove));
            };

            const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
              setNewSeparator(e.target.value);
            };

            const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter' && newSeparator.trim()) {
                e.preventDefault();
                handleAddSeparator();
              }
            };

            return (
              <FormItem>
                <FormLabel>{t('form.separator')}</FormLabel>
                <div className="flex flex-wrap gap-2 mb-2">
                  {field.value.map((sep, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      <span className="whitespace-pre">{JSON.stringify(sep).slice(1, -1)}</span>
                      {field.value.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1 rounded-full"
                          onClick={() => handleRemoveSeparator(sep)}
                        >
                          &times;
                        </Button>
                      )}
                    </Badge>
                  ))}
                </div>
                <FormControl>
                  <div className="flex gap-2">
                    <Input
                      placeholder={t('form.addSeparatorPlaceholder', '输入新分隔符后按 Enter 或点击添加')}
                      value={newSeparator}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                    />
                    <Button type="button" onClick={handleAddSeparator} disabled={!newSeparator.trim()}>
                      {t('form.add', '添加')}
                    </Button>
                  </div>
                </FormControl>
                <FormDescription>
                  {t('form.separatorDescription')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="custom_rules"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.customRules')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('form.customRulesPlaceholder')}
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {t('form.customRulesDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit">{t('form.applySettings')}</Button>
        </div>
      </form>
    </Form>
  );
}
