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
import { useEffect, useState } from 'react';

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
import { useDatasetTableColumns } from './use-dataset-table-columns';
import { useTranslation } from 'react-i18next';
import { useSelectedRecord } from '@/hooks/use-selected-record';
import { useChangeDocumentParser } from '@/hooks/use-change-document-parser';
import { cn } from '@/lib/utils';

interface ColumnMeta {
  cellClassName?: string;
}

interface DatasetTableProps {
  kbId: string;
}

export function DatasetTable({ kbId }: DatasetTableProps) {
  const {
    documents,
    pagination,
    setPagination,
  } = useFetchDocumentList(kbId);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [refreshKey, setRefreshKey] = useState(0);

  const { currentRecord, setRecord } = useSelectedRecord<IDocumentInfo>();
  const { t } = useTranslation('translation', { keyPrefix: 'dataset' });

  const {
    changeParserLoading,
    onChangeParserOk,
    changeParserVisible,
    hideChangeParserModal,
    showChangeParserModal,
  } = useChangeDocumentParser(currentRecord.id);

  const columns = useDatasetTableColumns({
    showChangeParserModal,
    setCurrentRecord: setRecord,
  });

  const currentPagination = useMemo(() => {
    return {
      pageIndex: (pagination.current || 1) - 1,
      pageSize: pagination.pageSize || 10,
    };
  }, [pagination]);

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
        const nextPagination = updaterOrValue(currentPagination);
        setPagination({
          current: nextPagination.pageIndex + 1,
          pageSize: nextPagination.pageSize,
          total: pagination.total,
        });
      } else {
        setPagination({
          current: updaterOrValue.current,
          pageSize: updaterOrValue.pageSize,
          total: pagination.total,
        });
      }
    },
    manualPagination: true,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: currentPagination,
    },
    rowCount: pagination.total ?? 0,
  });

  const refresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    if (window) {
      // @ts-ignore
      window.__refreshDatasetTable = refresh;
    }
  }, []);

  return (
    <div className="w-full">
      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-slate-50 hover:bg-slate-50">
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
                        (cell.column.columnDef.meta as ColumnMeta)?.cellClassName
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
          {table.getFilteredSelectedRowModel().rows.length} / {pagination?.total} 行已选择
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
            <span>共 {Math.ceil((pagination.total || 0) / pagination.pageSize)} 页</span>
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
          parserId={currentRecord.parser_id}
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
