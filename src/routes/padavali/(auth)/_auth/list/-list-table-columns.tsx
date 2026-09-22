'use client';

import { Link } from '@tanstack/react-router';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { type DataTableColumnDef } from '~/components/ui/data-table';

dayjs.extend(relativeTime);

export type PuzzleListItem = {
  id: number;
  uid: string;
  slug: string;
  title: string;
  description: string;
  listed: boolean;
  created_at: Date;
  updated_at: Date | null;
  image: { s3_key: string } | null;
};

export const listTableColumns: DataTableColumnDef<PuzzleListItem>[] = [
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
          to="/padavali/edit/$id"
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
    accessorKey: 'uid',
    header: 'UID',
    meta: { className: 'w-20' },
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">{row.getValue('uid')}</span>
    )
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
