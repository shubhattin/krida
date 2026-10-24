'use client';

import { Link } from '@tanstack/react-router';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { ExternalLinkIcon, InfoIcon, PencilIcon } from 'lucide-react';
import { buttonVariants } from '~/components/ui/button';
import { Button } from '~/components/ui/button';
import {
  type ColumnVisibilityState,
  DataTableColumnHeader,
  type DataTableColumnDef
} from '~/components/ui/data-table';
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger
} from '~/components/ui/popover';
import { getCDNUrl } from '~/constants';
import { cn } from '~/lib/utils';
import type { GameKind } from '~/util/catalog/tags';

dayjs.extend(relativeTime);

/** The admin list row shape shared by every game's `get_puzzle_list_page`. */
export type AdminPuzzleRow = {
  id: number;
  uid: string;
  slug: string;
  title: string;
  description: string;
  listed: boolean;
  created_at: Date;
  updated_at: Date | null;
  image: { s3_key: string } | null;
  tags?: { id: number; slug: string }[];
  collections?: { id: number; uid: string; title: string }[];
};

export const puzzleEditPath = (game: GameKind) => `/${game}/edit/$id` as const;
export const puzzleViewHref = (game: GameKind, uid: string) =>
  `/${game}/view/${encodeURIComponent(uid)}`;

/** Chips shown inline before collapsing the rest into "+N". */
const CHIP_PREVIEW_LIMIT = 2;

const muted = <span className="text-muted-foreground">—</span>;

/** Only the essentials are on by default; everything else is one click away in "Columns". */
export const DEFAULT_PUZZLE_COLUMN_VISIBILITY: ColumnVisibilityState = {
  image: false,
  description: false,
  uid: false,
  created_at: false,
  updated_at: false
};

function CappedChips<T>({
  heading,
  items,
  label,
  render
}: {
  /** Popover heading for the full list, e.g. "Tags". */
  heading: string;
  items: T[] | undefined;
  label: (item: T) => string;
  render: (item: T) => React.ReactNode;
}) {
  if (!items || items.length === 0) return muted;
  const shown = items.slice(0, CHIP_PREVIEW_LIMIT);
  const hidden = items.length - shown.length;
  return (
    <div
      className="flex min-w-0 items-center gap-1 overflow-hidden"
      title={items.map(label).join(', ')}
    >
      {shown.map(render)}
      {hidden > 0 ? (
        <Popover>
          <PopoverTrigger
            aria-label={`Show all ${items.length} ${heading.toLowerCase()}`}
            className="shrink-0 rounded-full px-1.5 py-0.5 text-xs text-muted-foreground tabular-nums hover:bg-muted hover:text-foreground"
          >
            +{hidden}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 gap-2">
            <PopoverHeader>
              <PopoverTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {heading} ({items.length})
              </PopoverTitle>
            </PopoverHeader>
            <div className="flex max-h-60 flex-wrap gap-1.5 overflow-y-auto">
              {items.map(render)}
            </div>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}

const chipClass =
  'min-w-0 max-w-32 truncate rounded-full border border-border/70 px-2 py-0.5 text-xs hover:bg-muted';

function RelativeDate({ date }: { date: Date }) {
  return (
    <span
      className="text-sm text-muted-foreground"
      title={dayjs(date).format('MMM D, YYYY h:mm A')}
    >
      {dayjs(date).fromNow()}
    </span>
  );
}

export function buildPuzzleTableColumns<TRow extends AdminPuzzleRow>({
  game,
  onShowDetails,
  extraColumns = []
}: {
  game: GameKind;
  onShowDetails: (row: TRow) => void;
  /** Game-specific columns, placed just before the status column. */
  extraColumns?: DataTableColumnDef<TRow>[];
}): DataTableColumnDef<TRow>[] {
  return [
    {
      accessorKey: 'id',
      header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
      meta: { className: 'w-16', label: 'ID' },
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {row.original.id}
        </span>
      )
    },
    {
      id: 'image',
      header: 'Image',
      enableSorting: false,
      meta: { className: 'w-18', label: 'Image' },
      cell: ({ row }) =>
        row.original.image ? (
          <img
            src={getCDNUrl(row.original.image.s3_key)}
            alt=""
            loading="lazy"
            className="aspect-[3/2] w-12 rounded border border-border/50 object-cover"
          />
        ) : (
          muted
        )
    },
    {
      accessorKey: 'title',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
      meta: { label: 'Title' },
      cell: ({ row }) => (
        <Link
          to={puzzleEditPath(game)}
          params={{ id: String(row.original.id) }}
          className="block truncate font-medium hover:underline"
          title={row.original.title}
        >
          {row.original.title}
        </Link>
      )
    },
    {
      accessorKey: 'slug',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Slug" />,
      meta: { className: 'w-48', label: 'Slug' },
      cell: ({ row }) => (
        <span
          className="block truncate font-mono text-xs text-muted-foreground"
          title={row.original.slug}
        >
          {row.original.slug}
        </span>
      )
    },
    {
      accessorKey: 'description',
      header: 'Description',
      enableSorting: false,
      meta: { className: 'w-64', label: 'Description' },
      cell: ({ row }) =>
        row.original.description ? (
          <span
            className="block truncate text-sm text-muted-foreground"
            title={row.original.description}
          >
            {row.original.description}
          </span>
        ) : (
          muted
        )
    },
    {
      accessorKey: 'uid',
      header: 'UID',
      enableSorting: false,
      meta: { className: 'w-24', label: 'UID' },
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.uid}</span>
      )
    },
    {
      id: 'tags',
      header: 'Tags',
      enableSorting: false,
      meta: { className: 'w-52', label: 'Tags' },
      cell: ({ row }) => (
        <CappedChips
          heading="Tags"
          items={row.original.tags}
          label={(tag) => tag.slug}
          render={(tag) => (
            <Link
              key={tag.id}
              to="/tags/edit/$slug"
              params={{ slug: tag.slug }}
              target="_blank"
              rel="noopener noreferrer"
              className={chipClass}
            >
              {tag.slug}
            </Link>
          )}
        />
      )
    },
    {
      id: 'collections',
      header: 'Collections',
      enableSorting: false,
      meta: { className: 'w-52', label: 'Collections' },
      cell: ({ row }) => (
        <CappedChips
          heading="Collections"
          items={row.original.collections}
          label={(collection) => collection.title}
          render={(collection) => (
            <Link
              key={collection.id}
              to="/collections/edit/$uid"
              params={{ uid: collection.uid }}
              target="_blank"
              rel="noopener noreferrer"
              className={chipClass}
            >
              {collection.title}
            </Link>
          )}
        />
      )
    },
    ...extraColumns,
    {
      accessorKey: 'listed',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      meta: { className: 'w-24', label: 'Status' },
      cell: ({ row }) => (
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-semibold',
            row.original.listed
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
              : 'bg-slate-500/10 text-slate-500'
          )}
        >
          {row.original.listed ? 'Listed' : 'Draft'}
        </span>
      )
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
      meta: { className: 'w-32', label: 'Created' },
      cell: ({ row }) => <RelativeDate date={row.original.created_at} />
    },
    {
      id: 'updated_at',
      accessorFn: (row) => row.updated_at ?? row.created_at,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
      meta: { className: 'w-32', label: 'Updated' },
      cell: ({ row }) => <RelativeDate date={row.original.updated_at ?? row.original.created_at} />
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      enableHiding: false,
      enableSorting: false,
      meta: { className: 'w-28 text-right' },
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-0.5">
          <Link
            to={puzzleEditPath(game)}
            params={{ id: String(row.original.id) }}
            aria-label="Edit"
            title="Edit"
            className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
          >
            <PencilIcon />
          </Link>
          <a
            href={puzzleViewHref(game, row.original.uid)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View (new tab)"
            title="View (new tab)"
            className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
          >
            <ExternalLinkIcon />
          </a>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Details"
            title="Details"
            onClick={() => onShowDetails(row.original)}
          >
            <InfoIcon />
          </Button>
        </div>
      )
    }
  ];
}
