'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { LayoutGridIcon, SearchIcon, TableIcon } from 'lucide-react';
import { client } from '~/api/client';
import { AdminCatalogFilters } from '~/components/pages/catalog/AdminCatalogFilters';
import { CatalogAdminLinks } from '~/components/pages/catalog/CatalogAdminLinks';
import { Button } from '~/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { DataTable, type DataTableColumnDef } from '~/components/ui/data-table';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import { Label } from '~/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '~/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select';
import { Skeleton } from '~/components/ui/skeleton';
import { cn } from '~/lib/utils';
import {
  SIMPLE_GAME_META,
  simpleGameEditHref,
  simpleGameViewHref,
  type SimpleGameKind
} from '~/util/games/kinds';

dayjs.extend(relativeTime);

type ListItem = {
  id: number;
  uid: string;
  slug: string;
  title: string;
  description: string;
  listed: boolean;
  created_at: Date;
  updated_at: Date | null;
  tags?: { id: number; slug: string }[];
};

export function SimpleGameListPage({ kind }: { kind: SimpleGameKind }) {
  const meta = SIMPLE_GAME_META[kind];
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [listed, setListed] = useState<'all' | 'listed' | 'unlisted'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at'>('created_at');
  const [orderBy, setOrderBy] = useState<'asc' | 'desc'>('desc');
  const [layout, setLayout] = useState<'cards' | 'table'>('cards');
  const [tagSlug, setTagSlug] = useState('all');
  const [collectionId, setCollectionId] = useState('all');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [search]);

  const listedFilter = listed === 'all' ? undefined : listed === 'listed';
  const listQuery = useQuery({
    queryKey: [
      `${kind}_list`,
      page,
      debounced,
      listed,
      sortBy,
      orderBy,
      tagSlug,
      collectionId
    ],
    queryFn: () =>
      client[kind].get_puzzle_list_page.query({
        page,
        size: 12,
        search_title: debounced || undefined,
        listed_filter: listedFilter,
        sort_by: sortBy,
        order_by: orderBy,
        tag_slug: tagSlug === 'all' ? undefined : tagSlug,
        collection_id: collectionId === 'all' ? undefined : Number(collectionId)
      }),
    placeholderData: (prev) => prev
  });

  const items = (listQuery.data?.list ?? []) as ListItem[];
  const pageCount = listQuery.data?.pageCount ?? 1;
  const columns = useMemo(() => listColumns(kind), [kind]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <InputGroup className="max-w-sm flex-1">
          <InputGroupAddon>
            <SearchIcon className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            placeholder={`Search ${meta.name} puzzles`}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
        </InputGroup>
        <div className="space-y-1">
          <Label>Listed</Label>
          <Select
            value={listed}
            onValueChange={(value) => {
              if (value === 'all' || value === 'listed' || value === 'unlisted') {
                setListed(value);
                setPage(1);
              }
            }}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="listed">Listed</SelectItem>
              <SelectItem value="unlisted">Unlisted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Sort</Label>
          <Select
            value={sortBy}
            onValueChange={(value) => {
              if (value === 'created_at' || value === 'updated_at') setSortBy(value);
            }}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Created</SelectItem>
              <SelectItem value="updated_at">Updated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Order</Label>
          <Select
            value={orderBy}
            onValueChange={(value) => {
              if (value === 'asc' || value === 'desc') setOrderBy(value);
            }}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Latest</SelectItem>
              <SelectItem value="asc">Oldest</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-1">
          <Button
            variant={layout === 'cards' ? 'secondary' : 'outline'}
            size="icon"
            onClick={() => setLayout('cards')}
            aria-label="Card layout"
          >
            <LayoutGridIcon className="size-4" />
          </Button>
          <Button
            variant={layout === 'table' ? 'secondary' : 'outline'}
            size="icon"
            onClick={() => setLayout('table')}
            aria-label="Table layout"
          >
            <TableIcon className="size-4" />
          </Button>
        </div>
      </div>
      <AdminCatalogFilters
        tagSlug={tagSlug}
        collectionId={collectionId}
        onTagSlugChange={(value) => {
          setTagSlug(value);
          setPage(1);
        }}
        onCollectionIdChange={(value) => {
          setCollectionId(value);
          setPage(1);
        }}
      />
      <CatalogAdminLinks />
      {listQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      ) : layout === 'table' ? (
        <DataTable columns={columns} data={items} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card
              key={item.id}
              className={cn(
                'overflow-hidden border-border/70 bg-linear-to-br transition-shadow hover:shadow-md',
                meta.accent.wash
              )}
            >
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">
                    <a href={simpleGameEditHref(kind, item.id)} className="hover:underline">
                      {item.title}
                    </a>
                  </CardTitle>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      item.listed
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-500/10 text-slate-500'
                    )}
                  >
                    {item.listed ? 'Listed' : 'Draft'}
                  </span>
                </div>
                <CardDescription className="line-clamp-2">
                  {item.description || 'No description'}
                </CardDescription>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{item.slug}</span>
                  <span>{dayjs(item.updated_at ?? item.created_at).fromNow()}</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" render={<a href={simpleGameEditHref(kind, item.id)} />}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    render={<a href={simpleGameViewHref(kind, item.uid)} />}
                  >
                    View
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
      {pageCount > 1 ? (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  if (page > 1) setPage(page - 1);
                }}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>
                {page} / {pageCount}
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  if (page < pageCount) setPage(page + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}

function listColumns(kind: SimpleGameKind): DataTableColumnDef<ListItem>[] {
  return [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.id}</span>
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <a href={simpleGameEditHref(kind, row.original.id)} className="font-medium hover:underline">
          {row.original.title}
        </a>
      )
    },
    {
      accessorKey: 'slug',
      header: 'Slug',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.slug}</span>
    },
    {
      accessorKey: 'listed',
      header: 'Listed',
      cell: ({ row }) => (row.original.listed ? 'Yes' : 'No')
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <a className="text-sm underline" href={simpleGameEditHref(kind, row.original.id)}>
            Edit
          </a>
          <a className="text-sm underline" href={simpleGameViewHref(kind, row.original.uid)}>
            View
          </a>
        </div>
      )
    }
  ];
}
