'use client';

import {
  type ColumnDef,
  FlexRender,
  type RowData,
  tableFeatures,
  useTable
} from '@tanstack/react-table';

import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '~/components/ui/table';

/** Core-only table — no sorting/filtering/pagination. Stable outside components for inference. */
export const dataTableFeatures = tableFeatures({});

export type DataTableColumnDef<TData extends RowData, TValue = unknown> = ColumnDef<
  typeof dataTableFeatures,
  TData,
  TValue
>;

function columnClassName(columnDef: { meta?: unknown }) {
  if (!columnDef.meta || typeof columnDef.meta !== 'object' || !('className' in columnDef.meta)) {
    return undefined;
  }
  const className = columnDef.meta.className;
  return typeof className === 'string' ? className : undefined;
}

interface DataTableProps<TData extends RowData> {
  columns: DataTableColumnDef<TData>[];
  data: TData[];
  getRowId?: (row: TData) => string;
  scrollable?: boolean;
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  scrollable = false
}: DataTableProps<TData>) {
  const table = useTable({
    features: dataTableFeatures,
    data,
    columns,
    getRowId: (originalRow, index) => getRowId?.(originalRow) ?? String(index)
  });

  const headerGroups = table.getHeaderGroups();
  const rows = table.getRowModel().rows;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white/50 shadow-sm backdrop-blur-sm dark:border-slate-700/40 dark:bg-slate-800/30">
      <Table
        className="table-fixed"
        containerClassName={scrollable ? 'max-h-[70vh] overflow-auto' : undefined}
      >
        <TableHeader>
          {headerGroups.map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    columnClassName(header.column.columnDef),
                    scrollable && 'sticky top-0 z-10 bg-background'
                  )}
                >
                  {header.isPlaceholder ? null : <FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length ? (
            rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id} className={columnClassName(cell.column.columnDef)}>
                    <FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
