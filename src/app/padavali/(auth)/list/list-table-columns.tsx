'use client';

import { type ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

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

export const listTableColumns: ColumnDef<PuzzleListItem>[] = [
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
