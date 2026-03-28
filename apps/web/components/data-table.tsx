'use client';

import { type ReactNode, useCallback } from 'react';

export interface ColumnDef<T> {
  key: keyof T | string;
  header: string | ReactNode;
  render?: (row: T, index: number) => ReactNode;
  sortable?: boolean;
  className?: string;
  sortIndicatorClassName?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (row: T) => string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  onRowClick?: (row: T) => void;
  isRowHighlighted?: (row: T) => boolean;
  emptyMessage?: string;
  className?: string;
}

function SortIndicator({
  column,
  sortColumn,
  sortDirection,
  className,
}: {
  column: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  className?: string;
}) {
  if (column !== sortColumn) {
    return <span className="ml-1 text-gray-400 dark:text-gray-600">↕</span>;
  }
  return (
    <span className={`ml-1${className ? ` ${className}` : ''}`}>
      {sortDirection === 'asc' ? '↑' : '↓'}
    </span>
  );
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  sortColumn,
  sortDirection,
  onSort,
  onRowClick,
  isRowHighlighted,
  emptyMessage = 'No data available.',
  className,
}: DataTableProps<T>) {
  const handleHeaderClick = useCallback(
    (col: ColumnDef<T>) => {
      if (col.sortable && onSort) {
        onSort(String(col.key));
      }
    },
    [onSort],
  );

  const getCellValue = (row: T, col: ColumnDef<T>, index: number): ReactNode => {
    if (col.render) {
      return col.render(row, index);
    }
    const value = (row as Record<string, unknown>)[String(col.key)];
    if (value === null || value === undefined) return '';
    return String(value);
  };

  return (
    <div
      className={
        'overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700' +
        (className ? ` ${className}` : '')
      }
    >
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs uppercase">
          <tr>
            {columns.map((col) => {
              const isSortable = col.sortable && !!onSort;
              return (
                <th
                  key={String(col.key)}
                  className={
                    'px-4 py-3' +
                    (isSortable
                      ? ' cursor-pointer hover:text-gray-900 dark:hover:text-white select-none'
                      : '') +
                    (col.className ? ` ${col.className}` : '')
                  }
                  onClick={isSortable ? () => handleHeaderClick(col) : undefined}
                >
                  <span className="inline-flex items-center gap-0.5">
                    {col.header}
                    {isSortable && (
                      <SortIndicator
                        column={String(col.key)}
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        className={col.sortIndicatorClassName}
                      />
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-gray-400 dark:text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => {
              const highlighted = isRowHighlighted?.(row) ?? false;
              return (
                <tr
                  key={keyExtractor(row)}
                  className={
                    'bg-white dark:bg-gray-900' +
                    (onRowClick
                      ? ' cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800'
                      : ' hover:bg-gray-50 dark:hover:bg-gray-800') +
                    (highlighted ? ' !bg-primary-50 dark:!bg-primary-950' : '')
                  }
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className={'px-4 py-3' + (col.className ? ` ${col.className}` : '')}
                    >
                      {getCellValue(row, col, index)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
