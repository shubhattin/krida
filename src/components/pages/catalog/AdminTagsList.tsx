'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SearchIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useTRPC } from '~/api/client';
import { GameKindIcon, gameKindLabel } from '~/components/pages/catalog/GameKindIcon';
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious
} from '~/components/ui/pagination';
import { cn } from '~/lib/utils';
import type { GameKind } from '~/util/catalog/tags';

const TAG_PAGE_SIZE = 24;

type TagRow = {
  id: number;
  slug: string;
  name: string;
  padavali_count: number;
  crossword_count: number;
  total_count: number;
};

/** Shared admin tag browser — one list for every game. */
export function AdminTagsList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-3">
      <InputGroup className="w-full sm:max-w-sm">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          value={search}
          onChange={(event) => {
            setSearch(event.currentTarget.value);
            setPage(1);
          }}
          placeholder="Search tags"
          aria-label="Search tags"
        />
      </InputGroup>
      <TagsListBody
        page={page}
        search={debouncedSearch || undefined}
        onPageChange={setPage}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
    </div>
  );
}

function TagsGrid({
  tags,
  onSelect
}: {
  tags: Pick<TagRow, 'id' | 'slug' | 'total_count'>[];
  onSelect: (id: number) => void;
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
          <span className="text-xs text-muted-foreground">
            {tag.total_count} game{tag.total_count === 1 ? '' : 's'}
            {tag.total_count === 0 ? ' · unused' : ''}
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
              <div
                key={`${game.game}-${game.id}`}
                className="flex items-start gap-2 rounded-lg border border-border/60 p-2"
              >
                <GameKindIcon game={game.game} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{game.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {gameKindLabel(game.game)}
                    {game.description ? ` · ${game.description}` : ''}
                  </p>
                </div>
              </div>
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

function TagsListBody({
  page,
  search,
  onPageChange,
  selectedId,
  onSelect
}: {
  page: number;
  search: string | undefined;
  onPageChange: (page: number) => void;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const trpc = useTRPC();
  const tags_q = useQuery(
    trpc.catalog.list_tags.queryOptions({ page, size: TAG_PAGE_SIZE, search })
  );
  const tags = tags_q.data?.list ?? [];

  return (
    <div className="space-y-3">
      <TagsGrid tags={tags} onSelect={onSelect} />
      {tags.length === 0 && !tags_q.isLoading ? (
        <p className="text-sm text-muted-foreground">
          {search ? 'No tags match your search.' : 'No tags yet. Add them from a game editor.'}
        </p>
      ) : null}
      <TagsPagination
        page={page}
        pageCount={tags_q.data?.pageCount ?? 1}
        hasPrev={Boolean(tags_q.data?.hasPrev)}
        hasNext={Boolean(tags_q.data?.hasNext)}
        onPageChange={onPageChange}
      />
      <TagDetailDialog tags={tags} selectedId={selectedId} onDone={() => onSelect(null)} />
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
