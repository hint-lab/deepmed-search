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
import { useEffect, useState, useImperativeHandle, forwardRef, useCallback } from 'react';


import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useFetchDocumentList } from '@/hooks/use-document';
import { IDocument } from '@/types/document';
import { useTableColumns } from './use-table-columns';
import { useTranslate } from '@/contexts/language-context';
import { cn } from '@/lib/utils';


interface KnowledgeBaseTableProps {
  kbId: string;
}

export interface KnowledgeBaseTableRef {
  refresh: () => void;
  search: (value: string) => void;
}

const KnowledgeBaseTable = forwardRef<KnowledgeBaseTableRef, KnowledgeBaseTableProps>(
  ({ kbId }, ref) => {
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const {
      documents,
      pagination,
      loading,
      error,
      handleSearch,
      handlePageChange,
      refreshData,
      removeDocumentLocally,
      updateDocumentEnabledLocally,
    } = useFetchDocumentList(kbId);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = useState({});

    const { t } = useTranslate('knowledgeBase.table');


    const handleRefresh = useCallback(() => {
      setRefreshTrigger(prev => prev + 1);
    }, []);

    const columns = useTableColumns({
      onRefresh: handleRefresh,
      removeDocumentLocally: removeDocumentLocally,
      updateDocumentEnabledLocally: updateDocumentEnabledLocally
    });

    useImperativeHandle(ref, () => ({
      refresh: () => {
        setRefreshTrigger(prev => prev + 1);
      },
      search: (value: string) => {
        handleSearch(value);
      }
    }));

    useEffect(() => {
      refreshData();
    }, [refreshTrigger, refreshData]);

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
      return (
        <div className="w-full">
          <div className="rounded-md border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column, index) => (
                    <TableHead key={index} className="h-12 px-4">
                      <Skeleton className="h-4 w-[100px]" />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {columns.map((_, colIndex) => (
                      <TableCell key={colIndex} className="p-4">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between space-x-2 py-4">
            <Skeleton className="h-4 w-[150px]" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-8 w-[80px]" />
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-8 w-[80px]" />
            </div>
          </div>
        </div>
      );
    }

    if (error) {
      return <div>Error: {error.message}</div>;
    }

    return (
      <div className="w-full">
        <div className="rounded-md border bg-card shadow-sm ">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} >
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead
                        key={header.id}
                        className={cn("h-12 px-4 text-slate-600 font-medium",
                          (header.column.columnDef.meta as any)?.headerClassName)}
                      >
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
            {t('rowsSelected').replace('{count}', String(table.getFilteredSelectedRowModel().rows.length)).replace('{total}', String(pagination.total))}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 px-4 text-slate-600"
            >
              {t('previousPage')}
            </Button>
            <div className="flex items-center gap-1 text-sm text-slate-500">
              <span>{t('pageNumber').replace('{current}', String(pagination.current))}</span>
              <span>/</span>
              <span>{t('totalPages').replace('{total}', String(Math.ceil(pagination.total / pagination.pageSize)))}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 px-4 text-slate-600"
            >
              {t('nextPage')}
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

KnowledgeBaseTable.displayName = 'KnowledgeBaseTable';

export { KnowledgeBaseTable };
