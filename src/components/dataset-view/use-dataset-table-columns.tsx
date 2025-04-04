import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { IDocumentInfo } from '@/types/db/document';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/date';
import { getExtension } from '@/utils/document-util';
import { ColumnDef } from '@tanstack/table-core';
import { ArrowUpDown, MoreHorizontal, Pencil, Wrench } from 'lucide-react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useChangeDocumentParser } from '@/hooks/use-change-document-parser';
import Image from 'next/image';
import { useDocumentNavigation } from '@/hooks/use-document-navigation';

interface ColumnMeta {
  cellClassName?: string;
}

type UseDatasetTableColumnsType = Pick<
  ReturnType<typeof useChangeDocumentParser>,
  'showChangeParserModal'
> & { setCurrentRecord: (record: IDocumentInfo) => void };

export function useDatasetTableColumns({
  showChangeParserModal,
  setCurrentRecord,
}: UseDatasetTableColumnsType) {
  const { t } = useTranslation('translation', {
    keyPrefix: 'dataset',
  });

  const onShowChangeParserModal = useCallback(
    (record: IDocumentInfo) => () => {
      setCurrentRecord(record);
      showChangeParserModal();
    },
    [setCurrentRecord, showChangeParserModal],
  );

  const { navigateToChunkParsedResult } = useDocumentNavigation();

  const columns: ColumnDef<IDocumentInfo, any>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      meta: {
        cellClassName: 'w-12',
      } as ColumnMeta,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4 h-8 hover:bg-transparent"
          >
            <span className="mr-2">{t('name')}</span>
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        );
      },
      meta: {
        cellClassName: 'max-w-[20vw]',
      } as ColumnMeta,
      cell: ({ row }) => {
        const name: string = row.getValue('name');

        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="flex gap-2 cursor-pointer items-center"
                onClick={navigateToChunkParsedResult(
                  row.original.id,
                  row.original.kb_id,
                )}
              >
                <Image
                  src={`file-icon/${getExtension(name)}`}
                  width={24}
                  height={24}
                  alt={name}
                />
                <span className={cn('truncate font-medium')}>{name}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{name}</p>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      accessorKey: 'create_time',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4 h-8 hover:bg-transparent"
          >
            <span className="mr-2">{t('uploadDate')}</span>
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="text-slate-500">
          {formatDate(row.getValue('create_time'))}
        </div>
      ),
      meta: {
        cellClassName: 'w-48',
      } as ColumnMeta,
    },
    {
      accessorKey: 'parser_id',
      header: t('chunkMethod'),
      cell: ({ row }) => (
        <div className="text-slate-500">{row.getValue('parser_id')}</div>
      ),
      meta: {
        cellClassName: 'w-48',
      } as ColumnMeta,
    },
    {
      accessorKey: 'run',
      header: t('parsingStatus'),
      cell: ({ row }) => (
        <Button variant="destructive" size="sm" className="h-7 text-xs font-normal">
          {row.getValue('run')}
        </Button>
      ),
      meta: {
        cellClassName: 'w-32',
      } as ColumnMeta,
    },
    {
      id: 'actions',
      header: t('action'),
      enableHiding: false,
      cell: ({ row }) => {
        const record = row.original;

        return (
          <section className="flex gap-2 items-center">
            <Switch id="airplane-mode" className="scale-75" />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={onShowChangeParserModal(record)}
            >
              <Wrench className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <Pencil className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>操作</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => navigator.clipboard.writeText(record.id)}
                >
                  复制文档 ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>查看详情</DropdownMenuItem>
                <DropdownMenuItem>删除文档</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </section>
        );
      },
      meta: {
        cellClassName: 'w-48',
      } as ColumnMeta,
    },
  ];

  return columns;
}
