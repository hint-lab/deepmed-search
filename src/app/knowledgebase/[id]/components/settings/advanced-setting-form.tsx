'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useTranslate } from '@/hooks/use-language';

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

export default function AdvancedSettingForm() {
  const { t } = useTranslate('knowledgeBase');

  const formSchema = z.object({
    parser_id: z.string().min(1, {
      message: t('validation.parserRequired'),
    }),
    chunk_size: z.number().min(100).max(2000),
    chunk_overlap: z.number().min(0).max(1000),
    separator: z.string(),
    custom_rules: z.string(),
  });

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      parser_id: '',
      chunk_size: 500,
      chunk_overlap: 50,
      separator: '',
      custom_rules: '',
    },
  });

  function onSubmit(values: FormValues) {
    console.log(values);
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
              <FormLabel>{t('form.chunkSize')}</FormLabel>
              <FormControl>
                <Slider
                  min={100}
                  max={2000}
                  step={50}
                  defaultValue={[field.value]}
                  onValueChange={(value: number[]) => field.onChange(value[0])}
                />
              </FormControl>
              <FormDescription>
                {t('form.chunkSizeDescription')}
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
              <FormLabel>{t('form.chunkOverlap')}</FormLabel>
              <FormControl>
                <Slider
                  min={0}
                  max={1000}
                  step={10}
                  defaultValue={[field.value]}
                  onValueChange={(value: number[]) => field.onChange(value[0])}
                />
              </FormControl>
              <FormDescription>
                {t('form.chunkOverlapDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="separator"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.separator')}</FormLabel>
              <FormControl>
                <Input placeholder={t('form.separatorPlaceholder')} {...field} />
              </FormControl>
              <FormDescription>
                {t('form.separatorDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
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
