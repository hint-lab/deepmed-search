import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  FileText,
  File,
  Image as ImageIcon,
  FileType,
  Play,
  Pause,
  RefreshCw,
  Check,
  AlertCircle
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslate } from '@/hooks/use-language';
import { Badge } from '@/components/ui/badge';
import { formatBytes } from '@/utils/bytes';
import { ColumnMeta } from '@/types/columnMeta';
import { DocumentActions } from './document-actions';
import { useProcessDocumentChunks, useZeroxConvertToMarkdown } from '@/hooks/use-document';
import { useRouter } from 'next/navigation';

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
  const { t } = useTranslate('knowledgeBase.table');
  const {
    convertAnyToMarkdown,
    jobId,
    jobStatus,
    isLoading
  } = useZeroxConvertToMarkdown();
  const { startProcessingDocumentToChunks, cancelProcessingDocumentToChunks,
    retryProcessingDocumentToChunks, isProcessingDocumentToChunks } = useProcessDocumentChunks();

  const router = useRouter();

  const onShowChangeParserModal = useCallback(
    (record: IDocumentInfo) => () => {
      setCurrentRecord(record);
      showChangeParserModal();
    },
    [setCurrentRecord, showChangeParserModal],
  );

  const handleProcessBadge = (document: IDocumentInfo, status: string) => {
    console.log('handleProcessBadge', document, status, isProcessingDocumentToChunks);
    if (isProcessingDocumentToChunks) return;

    switch (status) {
      case 'pending':
        startProcessingDocumentToChunks(document);
        break;
      // case 'completed':
      //   if (document.chunk_num === 0) {
      //     startProcessingDocumentToChunks(document);
      //   }
      //   break;
      // case 'failed':
      //   retryProcessingDocumentToChunks(document);
      //   break;
      // case 'processing':
      //   // TODO: 实现取消处理
      //   cancelProcessingDocumentToChunks(document);
      //   break;
    }
  }

  const navigateToChunkParsedResult = useCallback((documentId: string, knowledgeBaseId: string) => {
    router.push(`/knowledge-base/${knowledgeBaseId}/document/${documentId}/chunks`);
  }, [router]);

  // 记录当前正在转换的文档ID
  const [convertingDocId, setConvertingDocId] = useState<string | null>(null);

  const handleConvertToMarkdown = async (documentId: string) => {
    setConvertingDocId(documentId);
    const result = await convertAnyToMarkdown(documentId);
    if (!result.success) {
      // 如果失败，清除正在转换的文档ID
      setConvertingDocId(null);
    }
  };

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
      header: t('fileChunkMethod'),
      cell: ({ row }) => {
        const parserId = row.getValue('parser_id') as string;
        return <div>{parserId || '-'}</div>;
      },
      meta: {
        cellClassName: 'w-48',
      } as ColumnMeta,
    },
    {
      accessorKey: 'processing_status',
      header: t('fileProcessingStatus.title'),
      cell: ({ row }) => {
        const status = (row.getValue('processing_status') as string) || 'pending';
        const document = row.original;
        let badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
        let icon = null;


        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size={"sm"}
              onClick={() => handleConvertToMarkdown(document.id)}
              className='hover:cursor-pointer text-xs'
            >
              {t('convertToMarkdown')}
            </Button>
          </div>
        );
      },
      meta: {
        cellClassName: 'w-32',
      } as ColumnMeta,
    },
    {
      accessorKey: 'chunk_num',
      header: t('fileChunkNum'),
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
      header: t('fileWordCount'),
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
      header: t('fileAction'),
      enableHiding: false,
      cell: ({ row }) => {
        const document = row.original;
        const status = document.processing_status;
        const chunkNum = document.chunk_num || 0;

        return (
          <div className="flex items-center gap-2">
            <DocumentActions
              document={document}
              onShowChangeParserModal={onShowChangeParserModal}
              onProcessChunks={() => handleProcessBadge(document, 'processing')}
              setCurrentRecord={setCurrentRecord}
              showChangeParserModal={showChangeParserModal}
            />
          </div >
        );
      },
      meta: {
        cellClassName: 'w-48',
      } as ColumnMeta,
    },
  ];

  return columns;
} 