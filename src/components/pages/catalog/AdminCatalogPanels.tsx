'use client';

import { useState, type ReactNode } from 'react';
import { Image } from '@unpic/react';
import { Link, useRouter } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTRPC } from '~/api/client';
import { GameKindIcon, gameKindLabel } from '~/components/pages/catalog/GameKindIcon';
import { invalidateCatalogQueries } from '~/components/pages/catalog/invalidateCatalogQueries';
import { Button } from '~/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious
} from '~/components/ui/pagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Textarea } from '~/components/ui/textarea';
import { getCDNUrl } from '~/constants';
import { cn } from '~/lib/utils';
import { normalizeTagSlug } from '~/util/catalog/tags';
import type { GameKind } from '~/util/catalog/tags';

const TAG_PAGE_SIZE = 24;

export function CollectionsPanel({ game }: { game: GameKind }) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const collections_q = useQuery(trpc.catalog.list_collections.queryOptions());
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  const create_mut = useMutation(
    trpc.catalog.create_collection.mutationOptions({
      onSuccess: async (created) => {
        toast.success('Collection created');
        setOpen(false);
        setTitle('');
        setSlug('');
        setDescription('');
        invalidateCatalogQueries(queryClient, trpc);
        await router.invalidate();
        const to =
          game === 'padavali' ? '/padavali/collections/$uid' : '/padajala/collections/$uid';
        await router.navigate({ to, params: { uid: created.uid } });
      },
      onError: (error) => {
        toast.error(error.message || 'Could not create collection');
      }
    })
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setOpen(true)}>
          New collection
        </Button>
      </div>
      {collections_q.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading collections…</p>
      ) : null}
      {(collections_q.data?.length ?? 0) === 0 && !collections_q.isLoading ? (
        <p className="text-sm text-muted-foreground">No collections yet.</p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(collections_q.data ?? []).map((collection) => (
          <Card key={collection.id} className="overflow-hidden">
            <CardHeader className="gap-2">
              <div className="flex items-start gap-3">
                {collection.image ? (
                  <Image
                    src={getCDNUrl(collection.image.s3_key)}
                    alt=""
                    width={96}
                    height={64}
                    className="h-16 w-24 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="h-16 w-24 shrink-0 rounded-md bg-muted" />
                )}
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">{collection.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {collection.description || 'No description'}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {collection.item_count} game{collection.item_count === 1 ? '' : 's'}
                  {collection.listed ? '' : ' · unlisted'}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  render={
                    <Link
                      to={
                        game === 'padavali'
                          ? '/padavali/collections/$uid'
                          : '/padajala/collections/$uid'
                      }
                      params={{ uid: collection.uid }}
                    />
                  }
                  nativeButton={false}
                >
                  Edit
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New collection</DialogTitle>
            <DialogDescription>
              A collection is a hand-picked list. You can add Padavali and Padajala games after it
              is created.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="collection-title">Title</Label>
              <Input
                id="collection-title"
                value={title}
                onChange={(event) => {
                  const next = event.currentTarget.value;
                  setTitle(next);
                  if (!slug || slug === normalizeTagSlug(title)) setSlug(normalizeTagSlug(next));
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="collection-slug">Slug</Label>
              <Input
                id="collection-slug"
                value={slug}
                onChange={(event) => setSlug(normalizeTagSlug(event.currentTarget.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="collection-description">Description</Label>
              <Textarea
                id="collection-description"
                value={description}
                onChange={(event) => setDescription(event.currentTarget.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              disabled={!title.trim() || !slug || create_mut.isPending}
              onClick={() =>
                create_mut.mutate({
                  title: title.trim(),
                  slug,
                  description: description.trim()
                })
              }
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function TagsPanel() {
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  return (
    <TagsPanelBody
      page={page}
      onPageChange={setPage}
      selectedId={selectedId}
      onSelect={setSelectedId}
    />
  );
}

function TagsPanelBody({
  page,
  onPageChange,
  selectedId,
  onSelect
}: {
  page: number;
  onPageChange: (page: number) => void;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const trpc = useTRPC();
  const tags_q = useQuery(
    trpc.catalog.list_tags.queryOptions({ page, size: TAG_PAGE_SIZE, search: undefined })
  );
  const games_q = useQuery(
    trpc.catalog.connected_games.queryOptions(
      { tag_id: selectedId ?? 0 },
      { enabled: selectedId !== null }
    )
  );
  const selected = tags_q.data?.list.find((tag) => tag.id === selectedId);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {(tags_q.data?.list ?? []).map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() => onSelect(tag.id)}
            className="rounded-xl border border-border/70 bg-card px-3 py-2 text-left transition-colors hover:bg-muted/60"
          >
            <span className="block font-medium">{tag.slug}</span>
            <span className="text-xs text-muted-foreground">
              {tag.total_count} game{tag.total_count === 1 ? '' : 's'}
            </span>
          </button>
        ))}
      </div>
      {(tags_q.data?.list.length ?? 0) === 0 && !tags_q.isLoading ? (
        <p className="text-sm text-muted-foreground">No tags yet. Add them from a game editor.</p>
      ) : null}
      {(tags_q.data?.pageCount ?? 1) > 1 ? (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                text="Prev"
                onClick={(event) => {
                  event.preventDefault();
                  if (tags_q.data?.hasPrev) onPageChange(page - 1);
                }}
                className={cn(!tags_q.data?.hasPrev ? 'pointer-events-none opacity-50' : undefined)}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="px-2 text-sm text-muted-foreground">
                {page} / {tags_q.data?.pageCount}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                text="Next"
                onClick={(event) => {
                  event.preventDefault();
                  if (tags_q.data?.hasNext) onPageChange(page + 1);
                }}
                className={cn(!tags_q.data?.hasNext ? 'pointer-events-none opacity-50' : undefined)}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}

      <Dialog open={selectedId !== null} onOpenChange={(open) => !open && onSelect(null)}>
        <DialogContent className="max-h-[80vh] overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.slug ?? games_q.data?.tag.slug ?? 'Tag'}</DialogTitle>
            <DialogDescription>Games carrying this tag.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
            {(games_q.data?.games ?? []).map((game) => (
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
            {games_q.isSuccess && games_q.data.games.length === 0 ? (
              <p className="text-sm text-muted-foreground">No games use this tag.</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AdminCatalogTabs({ game, children }: { game: GameKind; children: ReactNode }) {
  return (
    <Tabs defaultValue="puzzles">
      <TabsList>
        <TabsTrigger value="puzzles">Puzzles</TabsTrigger>
        <TabsTrigger value="collections">Collections</TabsTrigger>
        <TabsTrigger value="tags">Tags</TabsTrigger>
      </TabsList>
      <TabsContent value="puzzles">{children}</TabsContent>
      <TabsContent value="collections">
        <CollectionsPanel game={game} />
      </TabsContent>
      <TabsContent value="tags">
        <TagsPanel />
      </TabsContent>
    </Tabs>
  );
}
