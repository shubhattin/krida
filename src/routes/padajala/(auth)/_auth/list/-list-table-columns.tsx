'use client';

import { Link } from '@tanstack/react-router';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { type DataTableColumnDef } from '~/components/ui/data-table';

dayjs.extend(relativeTime);

export type CrosswordListItem = {
  id: number;
  slug: string;
  title: string;
  description: string;
  listed: boolean;
  created_at: Date;
  updated_at: Date | null;
  grid_dimensions: number[];
  image: { s3_key: string } | null;
};

export const crosswordListTableColumns: DataTableColumnDef<CrosswordListItem>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    meta: { className: 'w-14' },
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground tabular-nums">
        {row.getValue('id')}
      </span>
    )
  },
  {
    accessorKey: 'title',
    header: 'Title',
    meta: { className: 'w-[22%]' },
    cell: ({ row }) => {
      const item = row.original;
      return (
        <Link
          to="/padajala/edit/$id"
          params={{ id: String(item.id) }}
          className="font-medium hover:underline"
        >
          {item.title}
        </Link>
      );
    }
  },
  {
    accessorKey: 'description',
    header: 'Description',
    meta: { className: 'overflow-hidden' },
    cell: ({ row }) => {
      const description = row.original.description;
      if (!description) {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <span className="block truncate text-sm text-muted-foreground" title={description}>
          {description}
        </span>
      );
    }
  },
  {
    accessorKey: 'slug',
    header: 'Slug',
    meta: { className: 'w-52' },
    cell: ({ row }) => (
      <span className="max-w-48 truncate font-mono text-xs text-muted-foreground sm:max-w-xs">
        {row.getValue('slug')}
      </span>
    )
  },
  {
    id: 'grid',
    header: 'Grid',
    meta: { className: 'w-24' },
    cell: ({ row }) => {
      const [cols, rows] = row.original.grid_dimensions;
      return (
        <span className="text-muted-foreground tabular-nums">
          {cols}×{rows}
        </span>
      );
    }
  },
  {
    id: 'updated_at',
    accessorFn: (row) => row.updated_at ?? row.created_at,
    header: 'Updated',
    meta: { className: 'w-32' },
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
