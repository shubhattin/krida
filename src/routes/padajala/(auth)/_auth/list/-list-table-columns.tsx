'use client';

import type { AdminPuzzleRow } from '~/components/pages/catalog/puzzle_table/puzzle_table_columns';
import { type DataTableColumnDef } from '~/components/ui/data-table';

export type PadajalaListItem = AdminPuzzleRow & {
  grid_dimensions: number[];
};

/** Padajala-only columns layered onto the shared admin puzzle table. */
export const padajalaExtraColumns: DataTableColumnDef<PadajalaListItem>[] = [
  {
    id: 'grid',
    accessorFn: (row) => row.grid_dimensions[0] * row.grid_dimensions[1],
    header: 'Grid',
    meta: { className: 'w-20', label: 'Grid' },
    cell: ({ row }) => {
      const [cols, rows] = row.original.grid_dimensions;
      return (
        <span className="text-muted-foreground tabular-nums">
          {cols}×{rows}
        </span>
      );
    }
  }
];
