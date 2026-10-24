'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { DataTable, type DataTableColumnDef } from '~/components/ui/data-table';
import type { GameKind } from '~/util/catalog/tags';
import { PuzzleDetailsDialog } from './PuzzleDetailsDialog';
import {
  type AdminPuzzleRow,
  buildPuzzleTableColumns,
  DEFAULT_PUZZLE_COLUMN_VISIBILITY
} from './puzzle_table_columns';
import { usePersistentColumnVisibility } from './use_column_visibility';

/**
 * Admin puzzle table shared by every game's list page: essentials by default, a
 * persisted column picker, and a details dialog per row.
 */
export function AdminPuzzleTable<TRow extends AdminPuzzleRow>({
  game,
  data,
  extraColumns,
  defaultVisibility,
  fullList = false,
  toolbar
}: {
  game: GameKind;
  data: TRow[];
  /** Game-specific columns (inserted before Status). Must be a stable reference. */
  extraColumns?: DataTableColumnDef<TRow>[];
  /** Overrides for extra columns' default visibility. Must be a stable reference. */
  defaultVisibility?: Record<string, boolean>;
  /** Every matching row is loaded: scroll inside the table and allow header sorting. */
  fullList?: boolean;
  toolbar?: ReactNode;
}) {
  const [selected, setSelected] = useState<TRow | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const columns = useMemo(
    () =>
      buildPuzzleTableColumns<TRow>({
        game,
        extraColumns,
        onShowDetails: (row) => {
          setSelected(row);
          setDetailsOpen(true);
        }
      }),
    [game, extraColumns]
  );
  const defaults = useMemo(
    () => ({ ...DEFAULT_PUZZLE_COLUMN_VISIBILITY, ...defaultVisibility }),
    [defaultVisibility]
  );
  const columnVisibility = usePersistentColumnVisibility(`${game}_puzzles`, defaults);

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        getRowId={(row) => String(row.id)}
        scrollable={fullList}
        enableSorting={fullList}
        columnPicker
        toolbar={toolbar}
        columnVisibility={columnVisibility.visibility}
        onColumnVisibilityChange={columnVisibility.onChange}
        onResetColumns={columnVisibility.reset}
      />
      <PuzzleDetailsDialog
        game={game}
        puzzle={selected}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </>
  );
}
