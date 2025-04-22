'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useEffect, useState } from 'react';
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
import { IKnowledgeBase } from '@/types/knowledgebase';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslate } from '@/hooks/use-language';
import { useKnowledgeBase } from '@/contexts/knowledgebase-context';
import { toast } from 'sonner';

interface BasicSettingFormProps {
  kbId: string;
}

export default function BasicSettingForm({ kbId }: BasicSettingFormProps) {
  const { t } = useTranslate('knowledgeBase');
  const { getKnowledgeBaseById, isLoading, updateKnowledgeBase } = useKnowledgeBase();
  const [kbInfo, setKbInfo] = useState<IKnowledgeBase | null>(null);
  const formSchema = z.object({
    name: z.string().min(1, {
      message: t('validation.nameRequired'),
    }),
    description: z.string(),
    language: z.string().min(1, {
      message: t('validation.languageRequired'),
    }),
    tags: z.array(z.string()),
  });

  useEffect(() => {
    getKnowledgeBaseById(kbId).then((kb) => {
      if (kb) {
        setKbInfo(kb);
      }
    });
  }, [kbId, getKnowledgeBaseById]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      language: '',
      tags: [],
    },
  });

  // 当知识库信息加载完成后，更新表单的默认值
  useEffect(() => {
    if (kbInfo) {
      form.reset({
        name: kbInfo.name,
        description: kbInfo.description || '',
        language: 'zh', // 默认中文
        tags: [], // 暂时为空数组
      });
    }
  }, [kbInfo, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    updateKnowledgeBase(
      kbId,
      values.name,
      values.description,
      values.language);
    toast.success(t('form.saveSettingsSuccess'));
  }

  if (isLoading) {
    return <div>加载中...</div>;
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('form.name')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('form.namePlaceholder')} {...field} />
                </FormControl>
                <FormDescription>
                  {t('form.nameDescription')}
                </FormDescription>
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
                  <Input placeholder={t('form.descriptionPlaceholder')} {...field} />
                </FormControl>
                <FormDescription>
                  {t('form.descriptionDescription')}
                </FormDescription>
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
            <Button type="submit">{t('form.saveSettings')}</Button>
          </div>
        </form>
      </Form>
    </>
  );
}
