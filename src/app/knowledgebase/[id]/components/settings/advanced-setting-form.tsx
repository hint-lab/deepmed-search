'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useTranslate } from '@/contexts/language-context';
import { useKnowledgeBaseContext } from '@/contexts/knowledgebase-context';
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
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import ChunkMethodCard from './chunk-method-card';
import { Badge } from '@/components/ui/badge';



type FormValues = {
  parser_id: string;
  chunk_size: number;
  overlap_size: number;
  separators: string[];
  llm_chunk_prompt?: string;
};

export default function AdvancedSettingForm() {
  const { t } = useTranslate('knowledgeBase');
  const { currentKnowledgeBase, updateKnowledgeBase } = useKnowledgeBaseContext();
  
  const formSchema = z.object({
    parser_id: z.string().min(1, {
      message: 'parser is required',
    }),
    chunk_size: z.number().min(100).max(2000),
    overlap_size: z.number().min(0).max(1000),
    separators: z.array(z.string()), // 允许空数组
    llm_chunk_prompt: z.string().optional()
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      parser_id: currentKnowledgeBase?.parser_id || 'rule_segmentation',
      chunk_size: currentKnowledgeBase?.chunk_size || 500,
      overlap_size: currentKnowledgeBase?.overlap_size || 100,
      separators: currentKnowledgeBase?.separators || [],
      llm_chunk_prompt: (currentKnowledgeBase?.parser_config as any)?.llm_chunk_prompt || ''
    },
  });

  // 监听 parser_id 变化，自动调整 overlap
  const watchedParserId = form.watch('parser_id');
  useEffect(() => {
    if (watchedParserId === 'llm_segmentation') {
      // 大模型分段：自动设置 overlap 为 0
      form.setValue('overlap_size', 0);
    }
  }, [watchedParserId, form]);

  function onSubmit(values: FormValues) {
    console.log("Submitting separators:", values.separators);
    if (!currentKnowledgeBase?.id) {
      toast.error(t('settings.kbIdNotExist'));
      return;
    }
    
    // 构建 parser_config，保留现有配置并更新 llm_chunk_prompt
    const currentParserConfig = currentKnowledgeBase?.parser_config || {};
    const updatedParserConfig = {
      ...currentParserConfig,
      llm_chunk_prompt: values.llm_chunk_prompt || undefined
    };
    
    // 仅更新高级设置相关参数
    updateKnowledgeBase(
      currentKnowledgeBase.id,
      undefined,
      {
        chunk_size: values.chunk_size,
        chunk_overlap: values.overlap_size,
        separators: values.separators,
        parser_config: updatedParserConfig,
        parser_id: values.parser_id,
      }
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <ChunkMethodCard />

        <FormField
          control={form.control}
          name="chunk_size"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.chunkSize')} - {t('form.currentValue')}: {field.value}</FormLabel>
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
          name="overlap_size"
          render={({ field }) => {
            const isLlmMode = form.watch('parser_id') === 'llm_segmentation';
            return (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  {t('form.chunkOverlap')} - {t('form.currentValue')}: {field.value}
                  {isLlmMode && (
                    <Badge variant="outline" className="text-xs font-normal">
                      大模型模式: 推荐 0
                    </Badge>
                  )}
                </FormLabel>
                <FormControl>
                  <Slider
                    min={0}
                    max={form.watch('chunk_size') / 2 || 1000}
                    step={50}
                    value={[field.value]}
                    disabled={isLlmMode}
                    onValueChange={(value: number[]) => {
                      const chunkSize = form.getValues('chunk_size');
                      if (value[0] <= chunkSize / 2) {
                        field.onChange(value[0]);
                      } else {
                        field.onChange(Math.floor(chunkSize / 2));
                      }
                    }}
                    className={isLlmMode ? 'opacity-50' : ''}
                  />
                </FormControl>
                <FormDescription>
                  {isLlmMode ? (
                    <span className="text-amber-600 dark:text-amber-400">
                      💡 大模型分段会智能识别段落、表格和链接的边界，不需要 overlap
                    </span>
                  ) : (
                    `${t('form.chunkOverlapDescription')} (0-${form.watch('chunk_size') / 2})`
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        {form.watch('parser_id') === 'llm_segmentation' && (
          <FormField
            control={form.control}
            name="llm_chunk_prompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>大模型分块指令</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="例如：请智能识别段落边界，保持表格和链接的完整性，优先在章节标题处分割..."
                    className="min-h-[100px]"
                  />
                </FormControl>
                <FormDescription>
                  自定义大模型分块的提示词，用于指导如何识别段落边界、保护表格和链接等
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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
                toast.info(t('settings.separatorAlreadyExists'));
              }
            };

            const handleRemoveSeparator = (separatorToRemove: string) => {
              // 允许删除所有分隔符，包括最后一个
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
                      placeholder={t('form.addSeparatorPlaceholder')}
                      value={newSeparator}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                    />
                    <Button type="button" onClick={handleAddSeparator} disabled={!newSeparator.trim()}>
                      {t('form.add')}
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

        <div className="flex justify-end">
          <Button type="submit" onClick={() => onSubmit(form.getValues())}>{t('form.applySettings')}</Button>
        </div>
      </form>
    </Form>
  );
}
