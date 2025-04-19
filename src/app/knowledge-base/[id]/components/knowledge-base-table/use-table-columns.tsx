import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { IDocument } from '@/types/db/document';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/date';
import { getExtension } from '@/utils/document-util';
import { ColumnDef } from '@tanstack/react-table';
import { Switch } from '@/components/ui/switch';
import { ArrowUpDown } from 'lucide-react';
import { useCallback, useState, useRef, useEffect } from 'react';
import { useTranslate } from '@/hooks/use-language';
import { Badge } from '@/components/ui/badge';
import { formatBytes } from '@/utils/bytes';
import { ColumnMeta } from '@/types/columnMeta';
import { DocumentOptions } from './document-options';
import { DocumentProcessingStatus } from '@/types/db/enums';
import { useToggleDocumentEnabled } from '@/hooks/use-document';
import { FileIcon } from '@/components/file-icon';
// import { useProcessDocumentChunks, useZeroxConvertToMarkdown } from '@/hooks/use-document';
import { processDocumentDirectlyAction, updateDocumentProcessingStatusAction } from '@/actions/document-process';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export type UseKnowledgeBaseTableColumnsType = {
  showChangeParserModal: () => void;
  setCurrentRecord: (record: IDocument) => void;
};

export function useKnowledgeBaseTableColumns({
  showChangeParserModal,
  setCurrentRecord,
}: UseKnowledgeBaseTableColumnsType) {
  const { t } = useTranslate('knowledgeBase.table');
  // const {
  //   convertAnyToMarkdown,
  //   jobId,
  //   jobStatus,
  //   isLoading
  // } = useZeroxConvertToMarkdown();
  // const { startProcessingDocumentToChunks, cancelProcessingDocumentToChunks,
  //   retryProcessingDocumentToChunks, isProcessingDocumentToChunks } = useProcessDocumentChunks();

  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const { loading: toggleLoading, toggleDocumentEnabled } = useToggleDocumentEnabled();

  const refreshData = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const onShowChangeParserModal = useCallback(
    (record: IDocument) => () => {
      setCurrentRecord(record);
      showChangeParserModal();
    },
    [setCurrentRecord, showChangeParserModal],
  );

  const handleProcessBadge = async (document: IDocument) => {
    console.log('handleProcessBadge', document);
    // if (isProcessingDocumentToChunks) return;
    await handleConvertToMarkdown(document.id);
  }

  const navigateToChunkParsedResult = useCallback((documentId: string, knowledgeBaseId: string) => {
    router.push(`/knowledge-base/${knowledgeBaseId}/document/${documentId}/chunks`);
  }, [router]);

  // 记录当前正在转换的文档ID
  const [convertingDocId, setConvertingDocId] = useState<string | null>(null);

  const handleConvertToMarkdown = async (documentId: string) => {
    setConvertingDocId(documentId);

    try {
      // 更新文档状态为处理中
      await updateDocumentProcessingStatusAction(documentId, DocumentProcessingStatus.PROCESSING, {
        progress: 0,
        progressMsg: '开始处理'
      });

      // 调用处理函数
      const result = await processDocumentDirectlyAction(documentId, {
        model: 'gpt-4o-mini',
        maintainFormat: true,
      });

      console.log('转换结果:', result);

      if (!result.success) {
        // 如果失败，更新文档状态为失败
        await updateDocumentProcessingStatusAction(documentId, DocumentProcessingStatus.FAILED, {
          progress: 0,
          progressMsg: result.error || '处理失败',
          error: result.error
        });

        toast.error('转换失败: ' + (result.error || '未知错误'));
        setConvertingDocId(null);
        return;
      }

      toast.success('转换成功');
      setConvertingDocId(null);

      // 刷新页面以显示最新状态
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error('转换文档失败:', error);

      // 更新文档状态为失败
      await updateDocumentProcessingStatusAction(documentId, DocumentProcessingStatus.FAILED, {
        progress: 0,
        progressMsg: error.message || '处理失败',
        error: error.message
      });

      toast.error('转换失败: ' + (error.message || '未知错误'));
      setConvertingDocId(null);
    }
  };

  const handleToggle = useCallback(async (document: IDocument, newEnabled: boolean) => {
    // 添加延迟
    await new Promise(resolve => setTimeout(resolve, 500));

    const success = await toggleDocumentEnabled(
      document.id,
      newEnabled,
      (enabled) => {
        // 更新本地状态
        document.enabled = enabled;
        // 触发表格刷新
        refreshData();
      }
    );

    if (success) {
      toast.success(newEnabled ? '文档已启用' : '文档已禁用');
    } else {
      toast.error('操作失败');
    }
  }, [toggleDocumentEnabled, refreshData]);

  const columns: ColumnDef<IDocument>[] = [
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
          {t('documentName')}
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
                <FileIcon extension={extension} />
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
          {t('documentUploadDate')}
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
      header: t('documentChunkMethod'),
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
      header: t('documentProcessingStatus.title'),
      cell: ({ row }) => {
        const status = (row.getValue('processing_status') as string) || 'pending';
        const document = row.original;
        let badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
        let icon = null;

        // 根据状态设置不同的样式
        switch (status) {
          case DocumentProcessingStatus.PROCESSED:
            badgeVariant = 'default';
            break;
          case DocumentProcessingStatus.PROCESSING:
            badgeVariant = 'secondary';
            break;
          case DocumentProcessingStatus.FAILED:
            badgeVariant = 'destructive';
            break;
          default:
            badgeVariant = 'outline';
        }

        // 检查当前文档是否正在转换中
        const isConverting = convertingDocId === document.id;

        return (
          <div className="flex items-center gap-2">
            {isConverting ? (
              <Badge
                variant="secondary"
                className="text-xs flex items-center gap-1"
              >
                <span className="animate-spin">⟳</span> {t('processing')}
              </Badge>
            ) : (
              <Badge
                variant={badgeVariant}
                className="hover:cursor-pointer text-xs"
                onClick={() => handleProcessBadge(document)}
              >
                {status === DocumentProcessingStatus.PROCESSED
                  ? t('processed')
                  : status === DocumentProcessingStatus.PROCESSING
                    ? t('processing')
                    : status === DocumentProcessingStatus.FAILED
                      ? t('failed')
                      : t('convertToMarkdown')}
              </Badge>
            )}
          </div>
        );
      },
      meta: {
        cellClassName: 'w-32',
      } as ColumnMeta,
    },
    {
      accessorKey: 'chunk_num',
      header: t('documentChunkNum'),
      cell: ({ row }) => {
        console.log(row)
        const chunk_count = row.getValue('chunk_num') as number;
        return <div className="text-right">{chunk_count === undefined ? "-" : chunk_count}</div>;
      },
      meta: {
        cellClassName: 'w-48',
      } as ColumnMeta,
    },
    {
      accessorKey: 'token_num',
      header: t('documentWordCount'),
      cell: ({ row }) => {
        const count = row.getValue('token_num') as number;
        return <div className="text-right">{count === undefined ? "-" : count}</div>;
      },
      meta: {
        cellClassName: 'w-48',
      } as ColumnMeta,
    },
    {
      accessorKey: 'size',
      header: t('documentSize'),
      cell: ({ row }) => {
        const size = row.getValue('size') as number;

        return <div className="text-right">{formatBytes(size)}</div>;
      },
      meta: {
        cellClassName: 'w-48',
      } as ColumnMeta,
    },
    {
      id: 'enable',
      header: t('documentEnable'),
      enableHiding: false,
      cell: ({ row }) => {
        const document = row.original;
        const [localEnabled, setLocalEnabled] = useState(document.enabled);

        // 当 document.enabled 变化时更新本地状态
        useEffect(() => {
          setLocalEnabled(document.enabled);
        }, [document.enabled]);

        return (
          <div className="flex items-center gap-2">
            <Switch
              id={`status-${document.id}`}
              className="scale-75"
              checked={localEnabled}
              onCheckedChange={(checked) => {
                setLocalEnabled(checked);
                setTimeout(() => {
                  handleToggle(document, checked);
                }, 500);
              }}
            />
          </div>
        );
      },
      meta: {
        cellClassName: 'w-48',
      } as ColumnMeta,
    },
    {
      id: 'actions',
      header: t('documentAction'),
      enableHiding: false,
      cell: ({ row }) => {
        const document = row.original;
        const status = document.processing_status;
        const chunkNum = document.chunk_num || 0;

        return (
          <div className="flex items-center gap-2">
            <DocumentOptions
              document={document}
              onShowChangeParserModal={onShowChangeParserModal}
              onProcessChunks={() => handleProcessBadge(document)}
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