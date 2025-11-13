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
import { useFormContext } from 'react-hook-form';

export default function ChunkMethodCard() {
  const { t } = useTranslate('knowledgeBase');
  const form = useFormContext();
  const parserList = useSelectParserList();

  return (
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
  );
}
