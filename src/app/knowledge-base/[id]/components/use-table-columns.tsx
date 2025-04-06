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
  FileType,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react';
import { useCallback } from 'react';
import { useTranslate } from '@/hooks/use-language';
import { useChangeDocumentParser } from '@/hooks/use-change-document-parser';
import { useDocumentNavigation } from '@/hooks/use-document-navigation';
import { Badge } from '@/components/ui/badge';
import { formatBytes } from '@/utils/bytes';
import { ColumnMeta } from '@/types/columnMeta';

export type UseKnowledgeBaseTableColumnsType = {
  showChangeParserModal: () => void;
  setCurrentRecord: (record: IDocumentInfo) => void;
};
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

  // 添加处理 chunk 的回调函数
  const handleProcessChunks = useCallback(async (document: IDocumentInfo) => {
    try {
      const response = await fetch(`/api/documents/${document.id}/process-chunks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: document.id,
          knowledgeBaseId: document.knowledgeBaseId,
        }),
      });

      if (!response.ok) {
        throw new Error('处理失败');
      }

      // 刷新数据
      window.location.reload();
    } catch (error) {
      console.error('处理文档 chunks 失败:', error);
    }
  }, []);

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
                onClick={() => navigateToChunkParsedResult(
                  row.original.id,
                  row.original.knowledgeBaseId
                )}
              >
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
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {t('fileStatus.title')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const runStatus = (row.getValue('run') as string) || 'pending';
        let badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
        if (runStatus === 'processing') badgeVariant = 'default';
        if (runStatus === 'error') badgeVariant = 'destructive';
        return (
          <div
            className="cursor-pointer"
            onClick={() => navigateToChunkParsedResult(
              row.original.id,
              row.original.knowledgeBaseId
            )}
          >
            <Badge variant={badgeVariant}>{t(`fileStatus.${runStatus}`) || runStatus}</Badge>
          </div>
        );
      },
      meta: {
        cellClassName: 'w-32',
      } as ColumnMeta,
    },
    {
      accessorKey: 'processing_status',
      header: t('processingStatus.title'),
      cell: ({ row }) => {
        const status = (row.getValue('processing_status') as string) || 'pending';
        const document = row.original;
        let badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
        let icon = null;

        switch (status) {
          case 'processing':
            badgeVariant = 'default';
            icon = <RefreshCw className="h-4 w-4 animate-spin mr-1" />;
            break;
          case 'completed':
            badgeVariant = 'default';
            icon = <Play className="h-4 w-4 text-green-500 mr-1" />;
            break;
          case 'failed':
            badgeVariant = 'destructive';
            icon = <Pause className="h-4 w-4 text-red-500 mr-1" />;
            break;
          default:
            badgeVariant = 'secondary';
            icon = <Pause className="h-4 w-4 mr-1" />;
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center cursor-pointer">
                {icon}
                <Badge variant={badgeVariant}>{t(`processingStatus.${status}`) || status}</Badge>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
              {status === 'completed' && document.chunk_num === 0 && (
                <DropdownMenuItem onClick={() => handleProcessChunks(document)}>
                  {t('processChunks')}
                </DropdownMenuItem>
              )}
              {status === 'failed' && (
                <DropdownMenuItem onClick={() => handleProcessChunks(document)}>
                  {t('retry')}
                </DropdownMenuItem>
              )}
              {status === 'processing' && (
                <DropdownMenuItem onClick={() => handleProcessChunks(document)}>
                  {t('cancel')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => navigateToChunkParsedResult(
                  document.id,
                  document.knowledgeBaseId
                )}
              >
                {t('viewDetails')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      meta: {
        cellClassName: 'w-32',
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
        const isProcessing = document.processing_status === 'processing';
        const canProcessChunks = document.processing_status === 'completed' && document.chunk_num === 0;

        return (
          <section className="flex gap-2 items-center">
            <Switch
              id={`status-${document.id}`}
              className="scale-75"
              checked={document.status === 'enabled'}
              disabled={isProcessing}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={onShowChangeParserModal(document)}
              disabled={isProcessing}
            >
              <Wrench className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              disabled={isProcessing}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={isProcessing}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => navigator.clipboard.writeText(document.id)}
                  disabled={isProcessing}
                >
                  {t('copyId')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setCurrentRecord(document);
                    showChangeParserModal();
                  }}
                  disabled={isProcessing}
                >
                  {t('changeChunkMethod')}
                </DropdownMenuItem>
                <DropdownMenuItem disabled={isProcessing}>
                  {t('rename')}
                </DropdownMenuItem>
                {canProcessChunks && (
                  <DropdownMenuItem
                    onClick={() => handleProcessChunks(document)}
                  >
                    {t('processChunks')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  disabled={isProcessing}
                >
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