'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpDownIcon, FilterIcon, SearchIcon, SquareArrowOutUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { useTRPC } from '~/api/client';
import {
  GameKindIcon,
  PuzzleEditLink,
  gameKindLabel
} from '~/components/pages/catalog/GameKindIcon';
import { invalidateCatalogQueries } from '~/components/pages/catalog/invalidateCatalogQueries';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '~/components/ui/alert-dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '~/components/ui/accordion';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import { Label } from '~/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
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
import { cn } from '~/lib/utils';
import type { GameKind } from '~/util/catalog/tags';

const TAG_PAGE_SIZE = 24;

type TagSort = 'slug' | 'name' | 'created_at' | 'count';
type TagOrder = 'asc' | 'desc';

type TagRow = {
  id: number;
  slug: string;
  name: string;
  padavali_count: number;
  crossword_count: number;
  total_count: number;
};

const SORT_ITEMS: { label: string; value: TagSort }[] = [
  { label: 'Slug', value: 'slug' },
  { label: 'Name', value: 'name' },
  { label: 'Usage', value: 'count' },
  { label: 'Created', value: 'created_at' }
];

const ORDER_ITEMS: { label: string; value: TagOrder }[] = [
  { label: 'Ascending', value: 'asc' },
  { label: 'Descending', value: 'desc' }
];

/** Shared admin tag browser — one list for every game. */
export function AdminTagsList() {
  const [page, setPage] = useState(1);
  const [unusedPage, setUnusedPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState<TagSort>('slug');
  const [order, setOrder] = useState<TagOrder>('asc');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <InputGroup className="w-full sm:max-w-sm">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(event) => {
              setSearch(event.currentTarget.value);
              setPage(1);
              setUnusedPage(1);
            }}
            placeholder="Search tags"
            aria-label="Search tags"
          />
        </InputGroup>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Label className="px-1 text-xs font-semibold sm:text-sm" title="Sort field">
              <FilterIcon className="size-3.5 sm:size-4" />
            </Label>
            <Select
              items={SORT_ITEMS}
              value={sort}
              onValueChange={(value) => {
                if (!value) return;
                setSort(value);
                setPage(1);
                setUnusedPage(1);
              }}
            >
              <SelectTrigger size="sm" className="w-28 text-xs sm:text-sm" aria-label="Sort tags">
                <SelectValue />
              </SelectTrigger>
              <SelectDropdown items={SORT_ITEMS} />
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <Label className="px-1 text-xs font-semibold sm:text-sm" title="Sort order">
              <ArrowUpDownIcon className="size-3.5 sm:size-4" />
            </Label>
            <Select
              items={ORDER_ITEMS}
              value={order}
              onValueChange={(value) => {
                if (!value) return;
                setOrder(value);
                setPage(1);
                setUnusedPage(1);
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-32 text-xs sm:text-sm"
                aria-label="Tag sort order"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectDropdown items={ORDER_ITEMS} />
            </Select>
          </div>
        </div>
      </div>
      <TagsListBody
        page={page}
        unusedPage={unusedPage}
        search={debouncedSearch || undefined}
        sort={sort}
        order={order}
        onPageChange={setPage}
        onUnusedPageChange={setUnusedPage}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
    </div>
  );
}

function SelectDropdown({ items }: { items: { label: string; value: string }[] }) {
  return (
    <SelectContent alignItemWithTrigger={false}>
      {items.map((item) => (
        <SelectItem key={item.value} value={item.value}>
          {item.label}
        </SelectItem>
      ))}
    </SelectContent>
  );
}

function TagsGrid({
  tags,
  onSelect,
  unused
}: {
  tags: Pick<TagRow, 'id' | 'slug' | 'name' | 'total_count'>[];
  onSelect: (id: number) => void;
  unused?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {tags.map((tag) => (
        <button
          key={tag.id}
          type="button"
          onClick={() => onSelect(tag.id)}
          className="rounded-xl border border-border/70 bg-card px-3 py-2 text-left transition-colors hover:bg-muted/60"
        >
          <span className="block font-medium">{tag.slug}</span>
          {tag.name && tag.name !== tag.slug ? (
            <span className="block truncate text-xs text-muted-foreground">{tag.name}</span>
          ) : null}
          <span className="text-xs text-muted-foreground">
            {unused ? 'Unused' : `${tag.total_count} game${tag.total_count === 1 ? '' : 's'}`}
          </span>
        </button>
      ))}
    </div>
  );
}

function TagsPagination({
  page,
  pageCount,
  hasPrev,
  hasNext,
  onPageChange
}: {
  page: number;
  pageCount: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            text="Prev"
            onClick={(event) => {
              event.preventDefault();
              if (hasPrev) onPageChange(page - 1);
            }}
            className={cn(!hasPrev ? 'pointer-events-none opacity-50' : undefined)}
          />
        </PaginationItem>
        <PaginationItem>
          <span className="px-2 text-sm text-muted-foreground">
            {page} / {pageCount}
          </span>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext
            href="#"
            text="Next"
            onClick={(event) => {
              event.preventDefault();
              if (hasNext) onPageChange(page + 1);
            }}
            className={cn(!hasNext ? 'pointer-events-none opacity-50' : undefined)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

function TagGamesDialog({
  open,
  title,
  games,
  loaded,
  unused,
  tagId,
  onDeleted,
  onClose
}: {
  open: boolean;
  title: string;
  games: { game: GameKind; id: number; title: string; description: string | null }[];
  loaded: boolean;
  /** True when no puzzle carries this tag — offers delete. */
  unused: boolean;
  tagId: number | null;
  onDeleted: () => void;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const delete_mut = useMutation(
    trpc.catalog.delete_tag.mutationOptions({
      onSuccess: () => {
        toast.success('Tag deleted');
        setConfirmOpen(false);
        onDeleted();
        invalidateCatalogQueries(queryClient, trpc);
      },
      onError: (error) => {
        toast.error(error.message || 'Could not delete tag');
      }
    })
  );

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
        <DialogContent className="max-h-[80vh] overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>Games carrying this tag.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
            {games.map((game) => (
              <PuzzleEditLink
                key={`${game.game}-${game.id}`}
                game={game.game}
                id={game.id}
                className="flex items-start gap-2 rounded-lg border border-border/60 p-2 no-underline transition-colors hover:border-border hover:bg-muted/40"
              >
                <GameKindIcon game={game.game} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{game.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {gameKindLabel(game.game)}
                    {game.description ? ` · ${game.description}` : ''}
                  </p>
                </div>
                <SquareArrowOutUpRight
                  className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span className="sr-only">Edit {game.title} (opens in a new tab)</span>
              </PuzzleEditLink>
            ))}
            {loaded && games.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No games use this tag — it is safe to delete.
              </p>
            ) : null}
          </div>
          {loaded && unused && tagId !== null ? (
            <DialogFooter>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setConfirmOpen(true)}
              >
                Delete unused tag
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tag “{title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This tag is not used by any puzzle. Deleting it removes the tag permanently. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={delete_mut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={delete_mut.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (tagId !== null) delete_mut.mutate({ tag_id: tagId });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function AbandonedTagsSection({
  tags,
  total,
  search,
  page,
  pageCount,
  hasPrev,
  hasNext,
  loaded,
  onSelect,
  onPageChange
}: {
  tags: TagRow[];
  total: number;
  search: string | undefined;
  page: number;
  pageCount: number;
  hasPrev: boolean;
  hasNext: boolean;
  loaded: boolean;
  onSelect: (id: number) => void;
  onPageChange: (page: number) => void;
}) {
  if (!loaded || total === 0) return null;

  return (
    <Accordion defaultValue={[]}>
      <AccordionItem value="abandoned-tags" className="rounded-xl border border-border px-3">
        <AccordionTrigger className="hover:no-underline">
          <span className="flex items-baseline gap-2">
            <span>Abandoned tags</span>
            <span className="text-xs font-normal text-muted-foreground">
              {total} unused{search ? ' matching search' : ''}
            </span>
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-col gap-3 pb-3">
            <TagsGrid tags={tags} onSelect={onSelect} unused />
            <TagsPagination
              page={page}
              pageCount={pageCount}
              hasPrev={hasPrev}
              hasNext={hasNext}
              onPageChange={onPageChange}
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function TagsListBody({
  page,
  unusedPage,
  search,
  sort,
  order,
  onPageChange,
  onUnusedPageChange,
  selectedId,
  onSelect
}: {
  page: number;
  unusedPage: number;
  search: string | undefined;
  sort: TagSort;
  order: TagOrder;
  onPageChange: (page: number) => void;
  onUnusedPageChange: (page: number) => void;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const trpc = useTRPC();
  const tags_q = useQuery(
    trpc.catalog.list_tags.queryOptions({
      page,
      size: TAG_PAGE_SIZE,
      search,
      sort,
      order,
      usage: 'used'
    })
  );
  const unused_q = useQuery(
    trpc.catalog.list_tags.queryOptions({
      page: unusedPage,
      size: TAG_PAGE_SIZE,
      search,
      sort,
      order,
      usage: 'unused'
    })
  );
  const tags = tags_q.data?.list ?? [];
  const unused = unused_q.data?.list ?? [];
  const unusedTotal = unused_q.data?.total ?? 0;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <TagsGrid tags={tags} onSelect={onSelect} />
        {tags.length === 0 && !tags_q.isLoading ? (
          <p className="text-sm text-muted-foreground">
            {search
              ? 'No tags in use match your search.'
              : 'No tags in use yet. Add them from a game editor.'}
          </p>
        ) : null}
        <TagsPagination
          page={page}
          pageCount={tags_q.data?.pageCount ?? 1}
          hasPrev={Boolean(tags_q.data?.hasPrev)}
          hasNext={Boolean(tags_q.data?.hasNext)}
          onPageChange={onPageChange}
        />
      </section>
      <AbandonedTagsSection
        tags={unused}
        total={unusedTotal}
        search={search}
        page={unusedPage}
        pageCount={unused_q.data?.pageCount ?? 1}
        hasPrev={Boolean(unused_q.data?.hasPrev)}
        hasNext={Boolean(unused_q.data?.hasNext)}
        loaded={unused_q.isSuccess}
        onSelect={onSelect}
        onPageChange={onUnusedPageChange}
      />
      <TagDetailDialog
        tags={[...tags, ...unused]}
        selectedId={selectedId}
        onDone={() => onSelect(null)}
      />
    </div>
  );
}

/** Loads the selected tag's puzzles and shows the detail dialog. */
function TagDetailDialog({
  tags,
  selectedId,
  onDone
}: {
  tags: TagRow[];
  selectedId: number | null;
  onDone: () => void;
}) {
  const trpc = useTRPC();
  const games_q = useQuery(
    trpc.catalog.connected_games.queryOptions(
      { tag_id: selectedId ?? 0 },
      { enabled: selectedId !== null }
    )
  );
  const selected = tags.find((tag) => tag.id === selectedId);
  const games = games_q.data?.games ?? [];
  const tagId = selected?.id ?? games_q.data?.tag.id ?? null;

  return (
    <TagGamesDialog
      open={selectedId !== null}
      title={selected?.slug ?? games_q.data?.tag.slug ?? 'Tag'}
      games={games}
      loaded={games_q.isSuccess}
      unused={games_q.isSuccess && games.length === 0}
      tagId={tagId}
      onDeleted={onDone}
      onClose={onDone}
    />
  );
}
