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
import { ColumnDef } from '@tanstack/react-table';
import {
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  Wrench,
  FileText,
  File,
  Image as ImageIcon,
  FileType
} from 'lucide-react';
import { useCallback } from 'react';
import { useTranslate } from '@/hooks/use-language';
import { useChangeDocumentParser } from '@/hooks/use-change-document-parser';
import { useDocumentNavigation } from '@/hooks/use-document-navigation';
import { Badge } from '@/components/ui/badge';
import { formatBytes } from '@/utils/bytes';

interface ColumnMeta {
  cellClassName?: string;
}

type UseKnowledgeBaseTableColumnsType = Pick<
  ReturnType<typeof useChangeDocumentParser>,
  'showChangeParserModal'
> & { setCurrentRecord: (record: IDocumentInfo) => void };

// 根据文件扩展名获取对应的图标
const getFileIcon = (extension: string) => {
  switch (extension.toLowerCase()) {
    case 'pdf':
      return <FileType className="h-5 w-5 text-red-500" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return <ImageIcon className="h-5 w-5 text-blue-500" />;
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'html':
    case 'css':
      return <File className="h-5 w-5 text-yellow-500" />;
    default:
      return <FileText className="h-5 w-5 text-gray-500" />;
  }
};

export function useKnowledgeBaseTableColumns({
  showChangeParserModal,
  setCurrentRecord,
}: UseKnowledgeBaseTableColumnsType) {
  const { t } = useTranslate('knowledgeBase');

  const onShowChangeParserModal = useCallback(
    (record: IDocumentInfo) => () => {
      setCurrentRecord(record);
      showChangeParserModal();
    },
    [setCurrentRecord, showChangeParserModal],
  );

  const { navigateToChunkParsedResult } = useDocumentNavigation();

  const columns: ColumnDef<IDocumentInfo>[] = [
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
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {t('fileName')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: {
        cellClassName: 'max-w-[20vw]',
      } as ColumnMeta,
      cell: ({ row }) => {
        const name = row.getValue('name') as string;
        const extension = getExtension(name);
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
                {/* 使用动态图标组件代替 Image */}
                {getFileIcon(extension)}
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
      accessorKey: 'create_date',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {t('fileUploadDate')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.getValue('create_date') as string;
        return <div className="font-medium">{formatDate(date)}</div>;
      },
      meta: {
        cellClassName: 'w-48',
      } as ColumnMeta,
    },
    {
      accessorKey: 'parser_id',
      header: t('chunkMethod'),
      cell: ({ row }) => {
        const parserId = row.getValue('parser_id') as string;
        return <div>{parserId || '-'}</div>;
      },
      meta: {
        cellClassName: 'w-48',
      } as ColumnMeta,
    },
    {
      accessorKey: 'run',
      header: t('fileStatus'),
      cell: ({ row }) => {
        const runStatus = row.getValue('run') as string;
        let badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
        if (runStatus === 'processing') badgeVariant = 'default';
        if (runStatus === 'error') badgeVariant = 'destructive';
        return <Badge variant={badgeVariant}>{t(runStatus) || runStatus}</Badge>;
      },
      meta: {
        cellClassName: 'w-32',
      } as ColumnMeta,
    },
    {
      accessorKey: 'status',
      header: t('fileProcessStage'),
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        let badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
        if (status === 'enabled') badgeVariant = 'default';
        if (status === 'error') badgeVariant = 'destructive';
        return <Badge variant={badgeVariant}>{t(status) || status}</Badge>;
      },
      meta: {
        cellClassName: 'w-48',
      } as ColumnMeta,
    },
    {
      accessorKey: 'chunk_num',
      header: t('chunkNum'),
      cell: ({ row }) => {
        const count = row.getValue('chunk_num') as number;
        return <div className="text-right">{count}</div>;
      },
      meta: {
        cellClassName: 'w-48',
      } as ColumnMeta,
    },
    {
      accessorKey: 'token_num',
      header: t('wordCount'),
      cell: ({ row }) => {
        const count = row.getValue('token_num') as number;
        return <div className="text-right">{count}</div>;
      },
      meta: {
        cellClassName: 'w-48',
      } as ColumnMeta,
    },
    {
      accessorKey: 'size',
      header: t('fileSize'),
      cell: ({ row }) => {
        const size = row.getValue('size') as number;
        return <div className="text-right">{formatBytes(size)}</div>;
      },
      meta: {
        cellClassName: 'w-48',
      } as ColumnMeta,
    },
    {
      id: 'actions',
      header: t('actions'),
      enableHiding: false,
      cell: ({ row }) => {
        const document = row.original;

        return (
          <section className="flex gap-2 items-center">
            <Switch id="airplane-mode" className="scale-75" />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={onShowChangeParserModal(document)}
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
                <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => navigator.clipboard.writeText(document.id)}
                >
                  {t('copyId')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setCurrentRecord(document);
                    showChangeParserModal();
                  }}
                >
                  {t('changeChunkMethod')}
                </DropdownMenuItem>
                <DropdownMenuItem>{t('rename')}</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                  {t('delete')}
                </DropdownMenuItem>
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
