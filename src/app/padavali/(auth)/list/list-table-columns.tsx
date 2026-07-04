'use client';

import { type ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Checkbox } from '~/components/ui/checkbox';

dayjs.extend(relativeTime);

export type PuzzleListItem = {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  listed: boolean;
  created_at: Date;
  updated_at: Date | null;
};

type ListTableSelectionOptions = {
  selected_ids: Set<number>;
  onToggle: (id: number, checked: boolean) => void;
  onToggleAll: (ids: number[], checked: boolean) => void;
  page_ids: number[];
};

export function createListTableColumns({
  selected_ids,
  onToggle,
  onToggleAll,
  page_ids
}: ListTableSelectionOptions): ColumnDef<PuzzleListItem>[] {
  const all_selected = page_ids.length > 0 && page_ids.every((id) => selected_ids.has(id));

  return [
    {
      id: 'select',
      header: () => (
        <Checkbox
          checked={all_selected}
          onCheckedChange={(checked) => onToggleAll(page_ids, checked === true)}
          aria-label="Select all puzzles on this page"
        />
      ),
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Checkbox
            checked={selected_ids.has(item.id)}
            onCheckedChange={(checked) => onToggle(item.id, checked === true)}
            aria-label={`Select puzzle ${item.title}`}
            onClick={(e) => e.stopPropagation()}
          />
        );
      },
      enableSorting: false,
      enableHiding: false
    },
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {row.getValue('id')}
        </span>
      )
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Link href={`/padavali/edit/${item.id}`} className="font-medium hover:underline">
            {item.title}
          </Link>
        );
      }
    },
    {
      accessorKey: 'slug',
      header: 'Slug',
      cell: ({ row }) => (
        <span className="max-w-48 truncate font-mono text-xs text-muted-foreground sm:max-w-xs">
          {row.getValue('slug')}
        </span>
      )
    },
    {
      id: 'updated_at',
      accessorFn: (row) => row.updated_at ?? row.created_at,
      header: 'Updated',
      cell: ({ row }) => {
        const item = row.original;
        const date = item.updated_at ?? item.created_at;
        return (
          <span className="text-muted-foreground" title={dayjs(date).format('MMM D, YYYY h:mm A')}>
            {dayjs(date).fromNow()}
          </span>
        );
      }
    }
  ];
}

/** @deprecated Use createListTableColumns for selection support */
export const listTableColumns: ColumnDef<PuzzleListItem>[] = createListTableColumns({
  selected_ids: new Set(),
  onToggle: () => {},
  onToggleAll: () => {},
  page_ids: []
});
