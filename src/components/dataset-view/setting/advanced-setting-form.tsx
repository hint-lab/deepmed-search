'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

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

const formSchema = z.object({
  parser_id: z.string().min(1, {
    message: '请选择分块方式',
  }),
  chunk_size: z.number().min(100).max(2000),
  chunk_overlap: z.number().min(0).max(1000),
  separator: z.string(),
  custom_rules: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

export default function AdvancedSettingForm() {
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
              <FormLabel>分块大小</FormLabel>
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
                设置每个文本块的最大字符数（100-2000）
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
              <FormLabel>重叠大小</FormLabel>
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
                设置相邻文本块之间的重叠字符数（0-1000）
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
              <FormLabel>分隔符</FormLabel>
              <FormControl>
                <Input placeholder="输入自定义分隔符" {...field} />
              </FormControl>
              <FormDescription>
                自定义文本分块的分隔符（可选）
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
              <FormLabel>自定义规则</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="输入自定义分块规则"
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                输入自定义的文本分块规则（可选）
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit">应用设置</Button>
        </div>
      </form>
    </Form>
  );
}
