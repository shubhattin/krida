'use client';

import { useMemo, useState } from 'react';
import { Image } from '@unpic/react';
import { Link, useRouter } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeftIcon, GripVerticalIcon, SearchIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useTRPC } from '~/api/client';
import { GameKindIcon, gameKindLabel } from '~/components/pages/catalog/GameKindIcon';
import { invalidateCatalogQueries } from '~/components/pages/catalog/invalidateCatalogQueries';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import { Textarea } from '~/components/ui/textarea';
import { getCDNUrl, KRIDAS } from '~/constants';
import { cn } from '~/lib/utils';
import { normalizeTagSlug, type GameKind } from '~/util/catalog/tags';
import {
  createTypingContext,
  clearTypingContextOnKeyDown,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';
import Icon from '~/tools/Icon';
import { LanguageIcon } from '~/components/icons';

type Props = {
  uid: string;
  backTo: '/padavali/list' | '/padajala/list';
};

type CollectionItem = {
  game: GameKind;
  order_index: number;
  puzzle: {
    id: number;
    slug: string;
    title: string;
    description: string;
    listed: boolean;
    image: { s3_key: string } | null;
  };
};

const itemKey = (item: { game: GameKind; puzzle: { id: number } }) =>
  `${item.game}:${item.puzzle.id}`;

export function CollectionEditPage({ uid, backTo }: Props) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const collection_q = useQuery(trpc.catalog.get_collection.queryOptions({ uid }));
  const collection = collection_q.data;

  const refresh = async () => {
    invalidateCatalogQueries(queryClient);
    await router.invalidate();
  };

  if (collection_q.isLoading) {
    return <p className="p-4 text-sm text-muted-foreground">Loading collection…</p>;
  }
  if (!collection) {
    return <p className="p-4 text-sm text-muted-foreground">Collection not found.</p>;
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6">
      <Link to={backTo} className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeftIcon className="size-4" />
        Back to list
      </Link>
      <CollectionForm
        key={`${collection.uid}:${collection.slug}:${collection.title}:${collection.description}:${collection.listed}`}
        collection={collection}
        onSaved={refresh}
      />
      <CollectionImage collection={collection} onSaved={refresh} />
      <CollectionItems collection={collection} onChanged={refresh} />
    </div>
  );
}

function CollectionForm({
  collection,
  onSaved
}: {
  collection: {
    uid: string;
    title: string;
    slug: string;
    description: string;
    listed: boolean;
    image: { id: number } | null;
  };
  onSaved: () => Promise<void>;
}) {
  const trpc = useTRPC();
  const [title, setTitle] = useState(collection.title);
  const [slug, setSlug] = useState(collection.slug);
  const [description, setDescription] = useState(collection.description);
  const [listed, setListed] = useState(collection.listed);

  const save_mut = useMutation(
    trpc.catalog.update_collection.mutationOptions({
      onSuccess: async () => {
        toast.success('Collection saved');
        await onSaved();
      },
      onError: (error) => toast.error(error.message || 'Could not save collection')
    })
  );

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        save_mut.mutate({
          uid: collection.uid,
          title: title.trim(),
          slug,
          description: description.trim(),
          listed,
          image_id: collection.image?.id ?? null
        });
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="edit-collection-title">Title</Label>
        <Input
          id="edit-collection-title"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="edit-collection-slug">Slug</Label>
        <Input
          id="edit-collection-slug"
          value={slug}
          onChange={(e) => setSlug(normalizeTagSlug(e.currentTarget.value))}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="edit-collection-description">Description</Label>
        <Textarea
          id="edit-collection-description"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
        />
      </div>
      <Label className="inline-flex items-center gap-2">
        <Switch checked={listed} onCheckedChange={setListed} />
        Listed publicly
      </Label>
      <div>
        <Button type="submit" disabled={save_mut.isPending || !title.trim() || !slug}>
          Save
        </Button>
      </div>
    </form>
  );
}

function CollectionImage({
  collection,
  onSaved
}: {
  collection: {
    uid: string;
    title: string;
    slug: string;
    description: string;
    listed: boolean;
    image: { id: number; s3_key: string; width: number; height: number } | null;
  };
  onSaved: () => Promise<void>;
}) {
  const trpc = useTRPC();
  const [extra, setExtra] = useState('');
  const save_mut = useMutation(trpc.catalog.update_collection.mutationOptions());
  const generate_mut = useMutation(
    trpc.ai_image_gen.generate_puzzle_card_image.mutationOptions({
      onSuccess: async (data) => {
        if (!data.success) {
          toast.error(`Image generation failed: ${data.err_code}`);
          return;
        }
        await save_mut.mutateAsync({
          uid: collection.uid,
          title: collection.title,
          slug: collection.slug,
          description: collection.description,
          listed: collection.listed,
          image_id: data.id
        });
        toast.success('Cover image saved');
        await onSaved();
      },
      onError: () => toast.error('Image generation failed')
    })
  );

  return (
    <div className="space-y-2">
      <Label>Cover</Label>
      <div className="aspect-3/2 w-full max-w-md overflow-hidden rounded-xl border border-border bg-muted">
        {collection.image ? (
          <Image
            src={getCDNUrl(collection.image.s3_key)}
            alt=""
            width={collection.image.width}
            height={collection.image.height}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
            No image
          </div>
        )}
      </div>
      <Textarea
        value={extra}
        onChange={(event) => setExtra(event.currentTarget.value)}
        placeholder="Extra instructions for the cover image"
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={generate_mut.isPending || !collection.title.trim()}
          onClick={() =>
            generate_mut.mutate({
              title: collection.title,
              description: collection.description,
              game: KRIDAS[0],
              subject: 'collection',
              extra_instructions: extra.trim() || undefined
            })
          }
        >
          {generate_mut.isPending ? 'Generating…' : 'Generate image'}
        </Button>
        {collection.image ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              save_mut.mutate(
                {
                  uid: collection.uid,
                  title: collection.title,
                  slug: collection.slug,
                  description: collection.description,
                  listed: collection.listed,
                  image_id: null
                },
                { onSuccess: () => void onSaved() }
              )
            }
          >
            Remove image
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function CollectionItems({
  collection,
  onChanged
}: {
  collection: { uid: string; id: number; items: CollectionItem[] };
  onChanged: () => Promise<void>;
}) {
  const trpc = useTRPC();
  const [addOpen, setAddOpen] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [reorderSession, setReorderSession] = useState(0);
  const remove_mut = useMutation(
    trpc.catalog.remove_item.mutationOptions({
      onSuccess: async () => {
        toast.success('Removed from collection');
        await onChanged();
      },
      onError: (error) => toast.error(error.message || 'Could not remove game')
    })
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Games</h2>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setReorderSession((session) => session + 1);
              setReorderOpen(true);
            }}
          >
            Reorder
          </Button>
          <Button type="button" onClick={() => setAddOpen(true)}>
            Add games
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {collection.items.map((item) => (
          <div
            key={itemKey(item)}
            className="flex items-center gap-2.5 rounded-lg border border-border/70 px-2.5 py-2"
          >
            <GameKindIcon game={item.game} className="size-6" />
            {item.puzzle.image ? (
              <Image
                src={getCDNUrl(item.puzzle.image.s3_key)}
                alt=""
                width={64}
                height={42}
                className="h-10 w-14 shrink-0 rounded object-cover"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.puzzle.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {gameKindLabel(item.game)}
                {item.puzzle.description ? ` · ${item.puzzle.description}` : ''}
              </p>
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={`Remove ${item.puzzle.title}`}
              onClick={() =>
                remove_mut.mutate({
                  uid: collection.uid,
                  game: item.game,
                  puzzle_id: item.puzzle.id
                })
              }
            >
              <XIcon />
            </Button>
          </div>
        ))}
      </div>
      {collection.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">This collection has no games yet.</p>
      ) : null}
      <AddGamesDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        collectionId={collection.id}
        uid={collection.uid}
        onAdded={onChanged}
      />
      <ReorderDialog
        key={reorderSession}
        open={reorderOpen}
        onOpenChange={setReorderOpen}
        uid={collection.uid}
        items={collection.items}
        onSaved={onChanged}
      />
    </div>
  );
}

type PickedGame = { game: GameKind; id: number; title: string };

function AddGamesDialog({
  open,
  onOpenChange,
  collectionId,
  uid,
  onAdded
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: number;
  uid: string;
  onAdded: () => Promise<void>;
}) {
  const trpc = useTRPC();
  const [query, setQuery] = useState('');
  const [tagSlug, setTagSlug] = useState('');
  const [game, setGame] = useState<'all' | GameKind>('all');
  const [lipi, setLipi] = useState(true);
  const [picked, setPicked] = useState<PickedGame[]>([]);
  const typing = useMemo(() => createTypingContext('Devanagari'), []);
  const tags_q = useQuery(trpc.catalog.list_tags.queryOptions({ page: 1, size: 100 }));
  const results_q = useQuery(
    trpc.catalog.search_puzzles.queryOptions({
      query,
      tag_slug: tagSlug || undefined,
      game,
      exclude_collection_id: collectionId,
      limit: 40
    })
  );
  const add_mut = useMutation(
    trpc.catalog.add_items.mutationOptions({
      onSuccess: async (result) => {
        toast.success(result.added === 1 ? 'Added 1 game' : `Added ${result.added} games`);
        setPicked([]);
        onOpenChange(false);
        await onAdded();
      },
      onError: (error) => toast.error(error.message || 'Could not add games')
    })
  );

  const pickedKeys = new Set(picked.map((item) => `${item.game}:${item.id}`));
  const results = (results_q.data ?? []).filter(
    (puzzle) => !pickedKeys.has(`${puzzle.game}:${puzzle.id}`)
  );

  const toggle = (puzzle: { game: GameKind; id: number; title: string }) => {
    setPicked((current) => {
      const key = `${puzzle.game}:${puzzle.id}`;
      if (current.some((item) => `${item.game}:${item.id}` === key)) {
        return current.filter((item) => `${item.game}:${item.id}` !== key);
      }
      return [...current, { game: puzzle.game, id: puzzle.id, title: puzzle.title }];
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setPicked([]);
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[85vh] flex-col gap-3 overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add games</DialogTitle>
        </DialogHeader>
        <div className="max-h-28 overflow-y-auto rounded-lg border border-border/70 bg-muted/40 p-1.5">
          {picked.length === 0 ? (
            <p className="px-1.5 py-1 text-xs text-muted-foreground">
              Nothing selected. Click games below, then add them together.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {picked.map((item) => (
                <span
                  key={`${item.game}:${item.id}`}
                  className="inline-flex max-w-full items-center gap-1 rounded-md bg-background px-1.5 py-0.5 text-xs shadow-sm"
                >
                  <GameKindIcon game={item.game} className="size-4" />
                  <span className="max-w-44 truncate">{item.title}</span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${item.title} from selection`}
                    onClick={() => toggle(item)}
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <InputGroup className="flex-1">
            <InputGroupAddon>
              <SearchIcon className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              placeholder="Search title or description"
              onChange={(event) => setQuery(event.currentTarget.value)}
              onBeforeInput={(event) => handleTypingBeforeInputEvent(typing, event, setQuery, lipi)}
              onBlur={() => typing.clearContext()}
              onKeyDown={(event) => clearTypingContextOnKeyDown(event, typing)}
            />
          </InputGroup>
          <Label className="inline-flex items-center gap-1">
            <Switch checked={lipi} onCheckedChange={setLipi} aria-label="Lipi Lekhika" />
            <Icon src={LanguageIcon} className="size-5" />
          </Label>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(['all', 'padavali', 'crossword'] as const).map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={game === value ? 'secondary' : 'outline'}
              onClick={() => setGame(value)}
            >
              {value === 'all' ? 'All' : value === 'padavali' ? 'Padavali' : 'Padajala'}
            </Button>
          ))}
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={tagSlug}
            onChange={(event) => setTagSlug(event.currentTarget.value)}
            aria-label="Filter by tag"
          >
            <option value="">Any tag</option>
            {(tags_q.data?.list ?? []).map((tag) => (
              <option key={tag.id} value={tag.slug}>
                {tag.slug}
              </option>
            ))}
          </select>
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {results.map((puzzle) => (
            <button
              key={`${puzzle.game}-${puzzle.id}`}
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-muted"
              onClick={() => toggle(puzzle)}
            >
              <GameKindIcon game={puzzle.game} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{puzzle.title}</span>
                {puzzle.description ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {puzzle.description}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
          {results_q.isSuccess && results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No matching games.</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            disabled={picked.length === 0 || add_mut.isPending}
            onClick={() =>
              add_mut.mutate({
                uid,
                items: picked.map((item) => ({ game: item.game, puzzle_id: item.id }))
              })
            }
          >
            {picked.length === 0 ? 'Add games' : `Add ${picked.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReorderDialog({
  open,
  onOpenChange,
  uid,
  items,
  onSaved
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uid: string;
  items: CollectionItem[];
  onSaved: () => Promise<void>;
}) {
  const trpc = useTRPC();
  const [order, setOrder] = useState(items);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const save_mut = useMutation(
    trpc.catalog.reorder.mutationOptions({
      onSuccess: async () => {
        toast.success('Order saved');
        onOpenChange(false);
        await onSaved();
      },
      onError: (error) => toast.error(error.message || 'Could not save order')
    })
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((current) => {
      const oldIndex = current.findIndex((item) => itemKey(item) === active.id);
      const newIndex = current.findIndex((item) => itemKey(item) === over.id);
      return arrayMove(current, oldIndex, newIndex);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reorder games</DialogTitle>
        </DialogHeader>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={order.map(itemKey)} strategy={verticalListSortingStrategy}>
            <div className="max-h-[50vh] space-y-1 overflow-y-auto">
              {order.map((item) => (
                <SortableRow key={itemKey(item)} item={item} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <DialogFooter>
          <Button
            type="button"
            disabled={save_mut.isPending}
            onClick={() =>
              save_mut.mutate({
                uid,
                items: order.map((item) => ({ game: item.game, puzzle_id: item.puzzle.id }))
              })
            }
          >
            Save order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SortableRow({ item }: { item: CollectionItem }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: itemKey(item)
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-2 rounded-md border border-border/70 bg-card px-2 py-1.5'
      )}
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <GameKindIcon game={item.game} />
      <span className="truncate text-sm">{item.puzzle.title}</span>
    </div>
  );
}
