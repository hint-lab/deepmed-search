'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useTranslate } from '@/contexts/language-context';
import { useKnowledgeBase } from '@/contexts/knowledgebase-context';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  name: z.string().min(1, { message: '知识库名称不能为空' }),
  description: z.string(),
  language: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

export default function BasicSettingForm() {
  const { t } = useTranslate('knowledgeBase');
  const { currentKnowledgeBase, updateKnowledgeBase } = useKnowledgeBase();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: currentKnowledgeBase?.name || '',
      description: currentKnowledgeBase?.description || '',
      language: currentKnowledgeBase?.language || '',
    },
  });

  function onSubmit(values: FormValues) {
    if (!currentKnowledgeBase?.id) {
      toast.error("知识库ID不存在");
      return;
    }
    // 仅更新基础设置相关参数
    updateKnowledgeBase(
      currentKnowledgeBase.id,
      {
        name: values.name,
        description: values.description,
        language: values.language
      },
      undefined
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.name')}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.description')}</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="language"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.language')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('form.languagePlaceholder')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="zh">{t('languages.zh')}</SelectItem>
                  <SelectItem value="en">{t('languages.en')}</SelectItem>
                  <SelectItem value="ja">{t('languages.ja')}</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                {t('form.languageDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" onClick={() => onSubmit(form.getValues())}>{t('form.applyBasicSettings')}</Button>
        </div>
      </form>
    </Form>
  );
}
