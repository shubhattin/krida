'use client';

import {
  type ColumnDef,
  FlexRender,
  type RowData,
  tableFeatures,
  useTable
} from '@tanstack/react-table';

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

interface DataTableProps<TData extends RowData> {
  columns: DataTableColumnDef<TData>[];
  data: TData[];
  getRowId?: (row: TData) => string;
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId
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
      <Table>
        <TableHeader>
          {headerGroups.map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
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
                  <TableCell key={cell.id}>
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
