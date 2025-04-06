'use client';

import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import * as React from 'react';
import { useEffect, useState, useImperativeHandle, forwardRef } from 'react';

import { ChunkMethodDialog } from '@/components/chunk-method-dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFetchDocumentList } from '@/hooks/use-document';
import { IDocumentInfo } from '@/types/db/document';
import { getExtension } from '@/utils/document-util';
import { useMemo } from 'react';
import { useKnowledgeBaseTableColumns } from './use-table-columns';
import { useTranslate } from '@/hooks/use-language';
import { useSelectedRecord } from '@/hooks/use-selected-record';
import { useChangeDocumentParser } from '@/hooks/use-change-document-parser';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface KnowledgeBaseTableProps {
  kbId: string;
}

export interface KnowledgeBaseTableRef {
  refresh: () => void;
}

const KnowledgeBaseTable = forwardRef<KnowledgeBaseTableRef, KnowledgeBaseTableProps>(
  ({ kbId }, ref) => {
    const [refreshKey, setRefreshKey] = useState(0);
    const {
      documents,
      pagination,
      loading,
      error,
      handleSearch,
      handlePageChange,
      refreshData,
    } = useFetchDocumentList(kbId);

    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = useState({});

    const { currentRecord, setRecord } = useSelectedRecord<IDocumentInfo>();
    const { t } = useTranslate('knowledgeBase');

    const {
      changeParserLoading,
      onChangeParserOk,
      changeParserVisible,
      hideChangeParserModal,
      showChangeParserModal,
    } = useChangeDocumentParser(currentRecord.id);

    const columns = useKnowledgeBaseTableColumns({
      showChangeParserModal,
      setCurrentRecord: setRecord,
    });

    useImperativeHandle(ref, () => ({
      refresh: () => {
        setRefreshKey(prev => prev + 1);
      }
    }));

    useEffect(() => {
      refreshData();
    }, [kbId, refreshKey]);

    // 处理文档状态变更
    const handleStatusChange = async (documentId: string, newStatus: string) => {
      try {
        const response = await fetch(`/api/documents/${documentId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) {
          throw new Error('状态更新失败');
        }

        toast.success(t('statusUpdatedSuccess'));

        refreshData();
      } catch (error) {
        toast.error(t('statusUpdateFailed'));
      }
    };

    // 处理文档删除
    const handleDelete = async (documentId: string) => {
      try {
        const response = await fetch(`/api/documents/${documentId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('删除失败');
        }

        toast.success(t('deleteSuccess'));

        refreshData();
      } catch (error) {
        toast.error(t('deleteFailed'));
      }
    };

    const table = useReactTable({
      data: documents,
      columns,
      onSortingChange: setSorting,
      onColumnFiltersChange: setColumnFilters,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      onColumnVisibilityChange: setColumnVisibility,
      onRowSelectionChange: setRowSelection,
      onPaginationChange: (updaterOrValue: any) => {
        if (typeof updaterOrValue === 'function') {
          const nextPagination = updaterOrValue({
            pageIndex: pagination.current - 1,
            pageSize: pagination.pageSize,
          });
          handlePageChange(nextPagination.pageIndex + 1);
        } else {
          handlePageChange(updaterOrValue.pageIndex + 1);
        }
      },
      manualPagination: true,
      state: {
        sorting,
        columnFilters,
        columnVisibility,
        rowSelection,
        pagination: {
          pageIndex: pagination.current - 1,
          pageSize: pagination.pageSize,
        },
      },
      rowCount: pagination.total,
    });

    if (loading) {
      return <div>Loading...</div>;
    }

    if (error) {
      return <div>Error: {error.message}</div>;
    }

    return (
      <div className="w-full">
        <div className="rounded-md border bg-card shadow-sm">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} >
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} className="h-12 px-4 text-slate-600 font-medium">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className="hover:bg-slate-50/70"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "p-4 align-middle [&:has([role=checkbox])]:pr-0",
                          (cell.column.columnDef.meta as any)?.cellClassName
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-slate-500"
                  >
                    {t('noResults')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-slate-500">
            {table.getFilteredSelectedRowModel().rows.length} / {pagination.total} 行已选择
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 px-4 text-slate-600"
            >
              上一页
            </Button>
            <div className="flex items-center gap-1 text-sm text-slate-500">
              <span>第 {pagination.current} 页</span>
              <span>/</span>
              <span>共 {Math.ceil(pagination.total / pagination.pageSize)} 页</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 px-4 text-slate-600"
            >
              下一页
            </Button>
          </div>
        </div>
        {changeParserVisible && (
          <ChunkMethodDialog
            documentId={currentRecord.id}
            parserId={currentRecord.parser_id || ''}
            parserConfig={currentRecord.parser_config}
            documentExtension={getExtension(currentRecord.name)}
            onOk={onChangeParserOk}
            visible={changeParserVisible}
            hideModal={hideChangeParserModal}
            loading={changeParserLoading}
          />
        )}
      </div>
    );
  }
);

KnowledgeBaseTable.displayName = 'KnowledgeBaseTable';

export { KnowledgeBaseTable };
