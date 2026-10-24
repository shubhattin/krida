'use client';

import { useState, type ReactNode } from 'react';
import {
  type Column,
  type ColumnDef,
  type ColumnVisibilityState,
  columnVisibilityFeature,
  createSortedRowModel,
  FlexRender,
  type OnChangeFn,
  type RowData,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  type SortingState,
  tableFeatures,
  useTable
} from '@tanstack/react-table';
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, Columns3Icon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '~/components/ui/table';

export type DataTableColumnMeta = {
  /** Applied to both the header and body cells of the column (widths, alignment). */
  className?: string;
  /** Human label for the column picker; falls back to the column id. */
  label?: string;
};

/** Stable outside components so column defs infer against it. */
export const dataTableFeatures = tableFeatures({
  columnVisibilityFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text
  },
  columnMeta: {} as DataTableColumnMeta
});

type DataTableFeatures = typeof dataTableFeatures;

export type DataTableColumnDef<TData extends RowData, TValue = unknown> = ColumnDef<
  DataTableFeatures,
  TData,
  TValue
>;

export type DataTableColumn<TData extends RowData> = Column<DataTableFeatures, TData, unknown>;

export type { ColumnVisibilityState };

interface DataTableProps<TData extends RowData> {
  columns: DataTableColumnDef<TData>[];
  data: TData[];
  getRowId?: (row: TData) => string;
  /** Caps the height and keeps the header sticky while the body scrolls. */
  scrollable?: boolean;
  /** Client-side sorting via clickable headers; only meaningful when every row is loaded. */
  enableSorting?: boolean;
  /** Controlled column visibility (e.g. persisted by the caller). */
  columnVisibility?: ColumnVisibilityState;
  onColumnVisibilityChange?: OnChangeFn<ColumnVisibilityState>;
  /** Show the "Columns" picker in a toolbar above the table. */
  columnPicker?: boolean;
  /** Extra toolbar content, rendered left of the column picker. */
  toolbar?: ReactNode;
  /** Fired by the picker's "Reset" item; omit to hide it. */
  onResetColumns?: () => void;
  emptyMessage?: ReactNode;
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  scrollable = false,
  enableSorting = false,
  columnVisibility,
  onColumnVisibilityChange,
  columnPicker = false,
  toolbar,
  onResetColumns,
  emptyMessage = 'No results.'
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useTable({
    features: dataTableFeatures,
    data,
    columns,
    getRowId: (originalRow, index) => getRowId?.(originalRow) ?? String(index),
    enableSorting,
    state: {
      sorting,
      ...(columnVisibility ? { columnVisibility } : {})
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange
  });

  const headerGroups = table.getHeaderGroups();
  const rows = table.getRowModel().rows;
  const visibleColumnCount = table.getVisibleLeafColumns().length;
  const showToolbar = columnPicker || toolbar != null;

  return (
    <div className="flex flex-col gap-2">
      {showToolbar ? (
        <div className="flex items-center justify-end gap-2">
          {toolbar}
          {columnPicker ? (
            <DataTableViewOptions columns={table.getAllLeafColumns()} onReset={onResetColumns} />
          ) : null}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white/50 shadow-sm backdrop-blur-sm dark:border-slate-700/40 dark:bg-slate-800/30">
        <Table
          className="min-w-3xl table-fixed"
          containerClassName={scrollable ? 'max-h-[70vh] overflow-auto' : undefined}
        >
          <TableHeader>
            {headerGroups.map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      header.column.columnDef.meta?.className,
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
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                      <FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={visibleColumnCount} className="h-24 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/** Header label that becomes a sort toggle when the column (and table) allow sorting. */
export function DataTableColumnHeader<TData extends RowData>({
  column,
  title,
  className
}: {
  column: DataTableColumn<TData>;
  title: string;
  className?: string;
}) {
  if (!column.getCanSort()) {
    return <span className={className}>{title}</span>;
  }

  const sorted = column.getIsSorted();
  const SortIcon = sorted === 'asc' ? ArrowUpIcon : sorted === 'desc' ? ArrowDownIcon : ArrowUpDownIcon;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn('-ml-2 h-7 px-2 data-[sorted=false]:text-foreground', className)}
      data-sorted={sorted !== false}
      onClick={column.getToggleSortingHandler()}
    >
      {title}
      <SortIcon className={cn('size-3.5', sorted === false && 'opacity-40')} />
    </Button>
  );
}

function DataTableViewOptions<TData extends RowData>({
  columns,
  onReset
}: {
  columns: DataTableColumn<TData>[];
  onReset?: () => void;
}) {
  const hideable = columns.filter((column) => column.getCanHide());

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <Columns3Icon />
        Columns
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
          {hideable.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(value)}
              closeOnClick={false}
            >
              {column.columnDef.meta?.label ?? column.id}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        {onReset ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onReset}>Reset to defaults</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
