'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { atom, createStore, Provider, useAtom } from 'jotai';
import { ArrowLeftIcon, GripVerticalIcon, ImageIcon, SearchIcon, Wand2, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useTRPC } from '~/api/client';
import { GameKindIcon, gameKindLabel } from '~/components/pages/catalog/GameKindIcon';
import { invalidateCatalogQueries } from '~/components/pages/catalog/invalidateCatalogQueries';
import { EditorActionDock } from '~/components/pages/puzzle/EditorActionDock';
import { Button } from '~/components/ui/button';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import { Label } from '~/components/ui/label';
import { Progress } from '~/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { Skeleton } from '~/components/ui/skeleton';
import { Switch } from '~/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Textarea } from '~/components/ui/textarea';
import { getCDNUrl, KRIDAS } from '~/constants';
import {
  EditorHistoryProvider,
  useEditorHistoryActions,
  useHistoryTextField
} from '~/hooks/useEditorHistory';
import { cn } from '~/lib/utils';
import {
  ExistingImageTab,
  useGenerationProgress
} from '~/components/pages/puzzle/PuzzleCardImageSection';
import { normalizeTagSlug, type GameKind } from '~/util/catalog/tags';
import {
  createTypingContext,
  clearTypingContextOnKeyDown,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';
import Icon from '~/tools/Icon';
import { LanguageIcon } from '~/components/icons';

const BASE_SCRIPT = 'Devanagari';

type Props = {
  uid: string;
};

type CollectionItem = {
  game: GameKind;
  puzzle: {
    id: number;
    slug: string;
    title: string;
    description: string;
    listed: boolean;
    image: { s3_key: string } | null;
  };
};

type CollectionImageInfo = {
  id: number;
  s3_key: string;
  width: number;
  height: number;
} | null;

type CollectionData = {
  id: number;
  uid: string;
  slug: string;
  title: string;
  description: string;
  listed: boolean;
  image: CollectionImageInfo;
  items: Array<CollectionItem & { order_index: number }>;
};

const itemKey = (item: { game: GameKind; puzzle: { id: number } }) =>
  `${item.game}:${item.puzzle.id}`;

const title_atom = atom('');
const slug_atom = atom('');
const description_atom = atom('');
const listed_atom = atom(false);
const lipi_lekhika_atom = atom(false);
const image_id_atom = atom<number | null>(null);
const image_info_atom = atom<CollectionImageInfo>(null);
const items_atom = atom<CollectionItem[]>([]);

const COLLECTION_HISTORY_ATOMS = {
  title: title_atom,
  slug: slug_atom,
  description: description_atom,
  listed: listed_atom,
  image_id: image_id_atom,
  image_info: image_info_atom,
  items: items_atom
};

function createCollectionStore(collection: CollectionData) {
  const store = createStore();
  store.set(title_atom, collection.title);
  store.set(slug_atom, collection.slug);
  store.set(description_atom, collection.description);
  store.set(listed_atom, collection.listed);
  store.set(lipi_lekhika_atom, false);
  store.set(image_id_atom, collection.image?.id ?? null);
  store.set(image_info_atom, collection.image);
  store.set(
    items_atom,
    collection.items.map(({ game, puzzle }) => ({ game, puzzle }))
  );
  return store;
}

export function CollectionEditPage({ uid }: Props) {
  const trpc = useTRPC();
  const collection_q = useQuery(trpc.catalog.get_collection.queryOptions({ uid }));
  const collection = collection_q.data;

  if (collection_q.isLoading) {
    return <p className="p-4 text-sm text-muted-foreground">Loading collection…</p>;
  }
  if (!collection) {
    return <p className="p-4 text-sm text-muted-foreground">Collection not found.</p>;
  }

  return <CollectionEditorShell key={collection.uid} collection={collection} />;
}

function CollectionEditorShell({ collection }: { collection: CollectionData }) {
  const [store] = useState(() => createCollectionStore(collection));

  return (
    <Provider store={store}>
      <EditorHistoryProvider atoms={COLLECTION_HISTORY_ATOMS}>
        <CollectionEditorBody collection={collection} />
      </EditorHistoryProvider>
    </Provider>
  );
}

function CollectionEditorBody({ collection }: { collection: CollectionData }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 pb-28">
      <Link
        to="/collections/list"
        className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to collections
      </Link>
      <CollectionMetaFields />
      <CollectionImageSection />
      <CollectionItemsSection />
      <CollectionDangerZone uid={collection.uid} />
      <CollectionSaveDock uid={collection.uid} />
    </div>
  );
}

function CollectionLipiSwitch() {
  const [lipi, setLipi] = useAtom(lipi_lekhika_atom);

  return (
    <div className="flex justify-center sm:justify-start">
      <Label className="inline-flex items-center gap-2 font-medium">
        <Switch checked={lipi} onCheckedChange={setLipi} className="-mt-1" />
        <Icon src={LanguageIcon} className="-mt-1 size-6.5" />
        <span className="text-base font-bold">Devanagari</span>
      </Label>
    </div>
  );
}

function CollectionMetaFields() {
  const [title, setTitle] = useAtom(title_atom);
  const [slug, setSlug] = useAtom(slug_atom);
  const [description, setDescription] = useAtom(description_atom);
  const [listed, setListed] = useAtom(listed_atom);
  const [lipi, setLipi] = useAtom(lipi_lekhika_atom);
  const titleHistory = useHistoryTextField();
  const slugHistory = useHistoryTextField();
  const descriptionHistory = useHistoryTextField();
  const { commit } = useEditorHistoryActions();

  const titleCtx = useMemo(() => createTypingContext(BASE_SCRIPT), []);
  const descriptionCtx = useMemo(() => createTypingContext(BASE_SCRIPT), []);

  useEffect(() => {
    void titleCtx.ready;
  }, [titleCtx]);
  useEffect(() => {
    void descriptionCtx.ready;
  }, [descriptionCtx]);

  const toggleLipiOnShortcut = (e: React.KeyboardEvent) => {
    if (e.altKey && (e.key === 'x' || e.key === 'X' || e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      setLipi((prev) => !prev);
      return true;
    }
    return false;
  };

  return (
    <div className="space-y-4">
      <CollectionLipiSwitch />

      <div className="space-y-1">
        <Label htmlFor="edit-collection-title">Title</Label>
        <Input
          id="edit-collection-title"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          onBeforeInput={(e) =>
            handleTypingBeforeInputEvent(titleCtx, e, (next) => setTitle(next), lipi)
          }
          onFocus={titleHistory.onFocus}
          onBlur={() => {
            titleCtx.clearContext();
            titleHistory.onBlur();
          }}
          onKeyDown={(e) => {
            if (toggleLipiOnShortcut(e)) return;
            clearTypingContextOnKeyDown(e, titleCtx);
          }}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="edit-collection-slug">Slug</Label>
        <Input
          id="edit-collection-slug"
          value={slug}
          onChange={(e) => setSlug(normalizeTagSlug(e.currentTarget.value))}
          onFocus={slugHistory.onFocus}
          onBlur={slugHistory.onBlur}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="edit-collection-description">Description</Label>
        <Textarea
          id="edit-collection-description"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          onBeforeInput={(e) =>
            handleTypingBeforeInputEvent(descriptionCtx, e, (next) => setDescription(next), lipi)
          }
          onFocus={descriptionHistory.onFocus}
          onBlur={() => {
            descriptionCtx.clearContext();
            descriptionHistory.onBlur();
          }}
          onKeyDown={(e) => {
            if (toggleLipiOnShortcut(e)) return;
            clearTypingContextOnKeyDown(e, descriptionCtx);
          }}
        />
      </div>

      <Label className="inline-flex items-center gap-2">
        <Switch
          checked={listed}
          onCheckedChange={(next) => {
            setListed(next);
            commit();
          }}
        />
        Listed publicly
      </Label>
    </div>
  );
}

function CollectionImageSection() {
  const [title] = useAtom(title_atom);
  const [description] = useAtom(description_atom);
  const [, setImageId] = useAtom(image_id_atom);
  const [imageInfo, setImageInfo] = useAtom(image_info_atom);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { commit } = useEditorHistoryActions();

  const clearImage = () => {
    setImageId(null);
    setImageInfo(null);
    commit();
  };

  return (
    <div className="space-y-3">
      <span className="text-lg font-bold">Cover</span>

      {imageInfo ? (
        <div className="flex flex-col items-start gap-3">
          <div className="aspect-3/2 w-full max-w-md overflow-hidden rounded-xl border border-border bg-muted">
            <Image
              src={getCDNUrl(imageInfo.s3_key)}
              alt=""
              width={imageInfo.width}
              height={imageInfo.height}
              className="size-full object-cover"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CollectionCoverDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              title={title}
              description={description}
              triggerLabel="Manage cover"
              onGenerated={(next) => {
                setImageId(next.id);
                setImageInfo(next);
                commit();
                setDialogOpen(false);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={clearImage}
            >
              <XIcon className="size-4" />
              Remove image
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex aspect-3/2 w-full max-w-md items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 text-sm text-muted-foreground">
            No image
          </div>
          <CollectionCoverDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            title={title}
            description={description}
            triggerLabel="Generate image"
            onGenerated={(next) => {
              setImageId(next.id);
              setImageInfo(next);
              commit();
              setDialogOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

type CoverPhase =
  | { state: 'idle' }
  | { state: 'generating' }
  | { state: 'done'; image_prompt: string; image_info: CoverImageInfo };

type CoverImageInfo = { id: number; s3_key: string; width: number; height: number };

function CollectionCoverDialog({
  open,
  onOpenChange,
  title,
  description,
  triggerLabel,
  onGenerated
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  triggerLabel: string;
  onGenerated: (info: CoverImageInfo) => void;
}) {
  const trpc = useTRPC();
  const [tab, setTab] = useState<'create' | 'existing'>('create');
  const [instructions, setInstructions] = useState('');
  const [phase, setPhase] = useState<CoverPhase>({ state: 'idle' });
  const [selected, setSelected] = useState<CoverImageInfo | null>(null);
  const progress = useGenerationProgress(phase.state === 'generating');

  const resetCreate = () => {
    setInstructions('');
    setPhase({ state: 'idle' });
  };

  const generate_mut = useMutation(
    trpc.ai_image_gen.generate_puzzle_card_image.mutationOptions({
      onSuccess: (data) => {
        if (!data.success) {
          toast.error(`Image generation failed: ${data.err_code}`);
          setPhase({ state: 'idle' });
          return;
        }
        setPhase({
          state: 'done',
          image_prompt: data.image_prompt,
          image_info: { id: data.id, s3_key: data.s3_key, width: 768, height: 512 }
        });
      },
      onError: () => {
        toast.error('Image generation failed');
        setPhase({ state: 'idle' });
      }
    })
  );

  const delete_mut = useMutation(
    trpc.image_assets.delete_image_asset.mutationOptions({
      onError: () => toast.error('Failed to delete image')
    })
  );

  const isWorking = phase.state === 'generating' || generate_mut.isPending || delete_mut.isPending;

  const startGenerate = () => {
    setPhase({ state: 'generating' });
    generate_mut.mutate({
      title: title.trim(),
      description: description.trim(),
      game: KRIDAS[0],
      subject: 'collection',
      extra_instructions: instructions.trim() || undefined
    });
  };

  const discardGenerated = () => {
    if (phase.state !== 'done') {
      setPhase({ state: 'idle' });
      return;
    }
    const id = phase.image_info.id;
    setPhase({ state: 'idle' });
    delete_mut.mutate({ id });
  };

  const useGenerated = () => {
    if (phase.state !== 'done') return;
    onGenerated(phase.image_info);
    toast.success('Cover image staged — save to apply');
  };

  const handleExistingDeleted = (id: number) => {
    if (selected?.id === id) setSelected(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isWorking) {
          resetCreate();
          setSelected(null);
          setTab('create');
        }
        if (!isWorking) onOpenChange(next);
      }}
    >
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <ImageIcon className="size-4" />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Collection cover image</DialogTitle>
          <DialogDescription>
            Generate a new cover from the title and description, or reuse an existing image.
          </DialogDescription>
        </DialogHeader>
        <Tabs
          value={tab}
          onValueChange={(value) => {
            if (value === 'create' || value === 'existing') setTab(value);
          }}
          className="gap-4"
        >
          <TabsList className="w-full">
            <TabsTrigger value="create" className="flex-1">
              Create new
            </TabsTrigger>
            <TabsTrigger value="existing" className="flex-1">
              Existing images
            </TabsTrigger>
          </TabsList>
          <TabsContent value="create">
            {phase.state === 'idle' ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="collection-cover-extra">
                    Custom instructions <span className="font-normal">(optional)</span>
                  </Label>
                  <Textarea
                    id="collection-cover-extra"
                    value={instructions}
                    onChange={(event) => setInstructions(event.currentTarget.value)}
                    placeholder="Optional guidance for the cover image"
                    className="min-h-24"
                  />
                </div>
                <Button
                  type="button"
                  disabled={isWorking || !title.trim()}
                  onClick={startGenerate}
                  className="gap-2"
                >
                  <Wand2 className="size-4" />
                  Generate cover
                </Button>
              </div>
            ) : null}
            {phase.state === 'generating' ? (
              <div className="flex w-full flex-col items-center gap-3">
                <Skeleton
                  className="w-full max-w-sm rounded-lg"
                  style={{ aspectRatio: '768 / 512' }}
                />
                <div className="w-full max-w-sm">
                  <Progress value={progress} className="w-full" />
                </div>
                <p className="text-xs text-muted-foreground">Generating cover…</p>
              </div>
            ) : null}
            {phase.state === 'done' ? (
              <div className="flex w-full flex-col items-center gap-3">
                <div
                  className="relative w-full max-w-sm overflow-hidden rounded-lg border border-border shadow"
                  style={{ aspectRatio: '768 / 512' }}
                >
                  <Image
                    src={getCDNUrl(phase.image_info.s3_key)}
                    alt="Generated collection cover"
                    width={768}
                    height={512}
                    className="block h-full w-full object-cover"
                  />
                </div>
                {phase.image_prompt ? (
                  <p className="line-clamp-3 w-full max-w-sm text-xs text-muted-foreground">
                    {phase.image_prompt}
                  </p>
                ) : null}
                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" disabled={isWorking} onClick={useGenerated}>
                    Use cover
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isWorking}
                    onClick={discardGenerated}
                  >
                    Discard
                  </Button>
                </div>
              </div>
            ) : null}
          </TabsContent>
          <TabsContent value="existing">
            <div className="space-y-3">
              <ExistingImageTab
                enabled={tab === 'existing'}
                selected_image_id={selected?.id ?? null}
                onSelect={setSelected}
                onImageDeleted={handleExistingDeleted}
              />
              <Button
                type="button"
                disabled={!selected || isWorking}
                onClick={() => {
                  if (selected) onGenerated(selected);
                }}
                className="gap-2"
              >
                Use selected image
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function CollectionItemsSection() {
  const [items, setItems] = useAtom(items_atom);
  const [addOpen, setAddOpen] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [reorderSession, setReorderSession] = useState(0);
  const { commit } = useEditorHistoryActions();

  const removeItem = (key: string) => {
    setItems((current) => current.filter((item) => itemKey(item) !== key));
    commit();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Games</h2>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={items.length < 2}
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
        {items.map((item) => (
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
              onClick={() => removeItem(itemKey(item))}
            >
              <XIcon />
            </Button>
          </div>
        ))}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">This collection has no games yet.</p>
      ) : null}
      <AddGamesDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        existingKeys={new Set(items.map(itemKey))}
        onAdd={(picked) => {
          setItems((current) => {
            const have = new Set(current.map(itemKey));
            const next = [...current];
            for (const puzzle of picked) {
              const key = `${puzzle.game}:${puzzle.id}`;
              if (have.has(key)) continue;
              have.add(key);
              next.push({
                game: puzzle.game,
                puzzle: {
                  id: puzzle.id,
                  slug: puzzle.slug,
                  title: puzzle.title,
                  description: puzzle.description,
                  listed: puzzle.listed,
                  image: puzzle.image
                }
              });
            }
            return next;
          });
          commit();
        }}
      />
      <ReorderDialog
        key={reorderSession}
        open={reorderOpen}
        onOpenChange={setReorderOpen}
        items={items}
        onApply={(ordered) => {
          setItems(ordered);
          commit();
        }}
      />
    </div>
  );
}

function CollectionDangerZone({ uid }: { uid: string }) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [items] = useAtom(items_atom);
  const [title] = useAtom(title_atom);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<'no' | 'yes'>('no');

  const padavaliCount = items.filter((item) => item.game === 'padavali').length;
  const crosswordCount = items.length - padavaliCount;
  const hasItems = items.length > 0;

  const delete_mut = useMutation(
    trpc.catalog.delete_collection.mutationOptions({
      onSuccess: async () => {
        toast.success('Collection deleted');
        invalidateCatalogQueries(queryClient, trpc);
        await router.invalidate();
        await router.navigate({ to: '/collections/list' });
      },
      onError: (error) => toast.error(error.message || 'Could not delete collection')
    })
  );

  const close = (next: boolean) => {
    if (delete_mut.isPending) return;
    if (!next) setConfirm('no');
    setOpen(next);
  };

  const runDelete = () => delete_mut.mutate({ uid });

  return (
    <section className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
      <h2 className="text-base font-semibold text-destructive">Danger zone</h2>
      <p className="text-sm text-muted-foreground">
        Deleting removes the collection and unlinks its games. Puzzles themselves are never deleted.
      </p>
      <Button type="button" variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Delete collection
      </Button>

      {hasItems ? (
        <Dialog open={open} onOpenChange={close}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete “{title || 'this collection'}”?</DialogTitle>
              <DialogDescription>
                This collection holds {items.length} game{items.length === 1 ? '' : 's'} (
                {padavaliCount} Padavali · {crosswordCount} Padajala). Deleting unlinks every game,
                but the puzzles themselves stay untouched. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <RadioGroup
              value={confirm}
              onValueChange={(value) => setConfirm(value === 'yes' ? 'yes' : 'no')}
              className="gap-2.5"
              aria-label="Confirm collection deletion"
            >
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border/70 px-3 py-2 text-sm">
                <RadioGroupItem value="no" />
                No, keep the collection
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-destructive/50 px-3 py-2 text-sm font-medium">
                <RadioGroupItem value="yes" />
                Yes, delete this collection
              </label>
            </RadioGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={confirm !== 'yes' || delete_mut.isPending}
                onClick={runDelete}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <AlertDialog open={open} onOpenChange={close}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete “{title || 'this collection'}”?</AlertDialogTitle>
              <AlertDialogDescription>
                This collection has no games. Deleting removes it permanently. This cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={delete_mut.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={delete_mut.isPending}
                onClick={(event) => {
                  event.preventDefault();
                  runDelete();
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </section>
  );
}

function CollectionSaveDock({ uid }: { uid: string }) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title] = useAtom(title_atom);
  const [slug] = useAtom(slug_atom);
  const [description] = useAtom(description_atom);
  const [listed] = useAtom(listed_atom);
  const [image_id] = useAtom(image_id_atom);
  const [items] = useAtom(items_atom);
  const { beginSave, markSaved } = useEditorHistoryActions();

  const save_mut = useMutation(
    trpc.catalog.save_collection.mutationOptions({
      onSuccess: async () => {
        markSaved();
        toast.success('Collection saved');
        invalidateCatalogQueries(queryClient, trpc);
        await router.invalidate();
      },
      onError: (error) => toast.error(error.message || 'Could not save collection')
    })
  );

  const handleSave = () => {
    const trimmedTitle = title.trim();
    const trimmedSlug = slug.trim();
    if (!trimmedTitle || !trimmedSlug) {
      toast.error('Title and slug are required');
      return;
    }
    beginSave();
    save_mut.mutate({
      uid,
      title: trimmedTitle,
      slug: trimmedSlug,
      description: description.trim(),
      listed,
      image_id,
      items: items.map((item) => ({ game: item.game, puzzle_id: item.puzzle.id }))
    });
  };

  return <EditorActionDock onSave={handleSave} isSaving={save_mut.isPending} />;
}

type PickedGame = {
  game: GameKind;
  id: number;
  slug: string;
  title: string;
  description: string;
  listed: boolean;
  image: { s3_key: string } | null;
};

function AddGamesDialog({
  open,
  onOpenChange,
  existingKeys,
  onAdd
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingKeys: Set<string>;
  onAdd: (picked: PickedGame[]) => void;
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
      limit: 40
    })
  );

  const pickedKeys = new Set(picked.map((item) => `${item.game}:${item.id}`));
  const results = (results_q.data ?? []).filter((puzzle) => {
    const key = `${puzzle.game}:${puzzle.id}`;
    return !existingKeys.has(key) && !pickedKeys.has(key);
  });

  const toggle = (puzzle: PickedGame) => {
    setPicked((current) => {
      const key = `${puzzle.game}:${puzzle.id}`;
      if (current.some((item) => `${item.game}:${item.id}` === key)) {
        return current.filter((item) => `${item.game}:${item.id}` !== key);
      }
      return [...current, puzzle];
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
                    onClick={() =>
                      setPicked((current) =>
                        current.filter(
                          (row) => `${row.game}:${row.id}` !== `${item.game}:${item.id}`
                        )
                      )
                    }
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
              onClick={() =>
                toggle({
                  game: puzzle.game,
                  id: puzzle.id,
                  slug: puzzle.slug,
                  title: puzzle.title,
                  description: puzzle.description,
                  listed: puzzle.listed,
                  image: puzzle.image
                })
              }
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
            disabled={picked.length === 0}
            onClick={() => {
              onAdd(picked);
              setPicked([]);
              onOpenChange(false);
              toast.success(
                picked.length === 1 ? 'Staged 1 game' : `Staged ${picked.length} games`
              );
            }}
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
  items,
  onApply
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CollectionItem[];
  onApply: (items: CollectionItem[]) => void;
}) {
  const [order, setOrder] = useState(items);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
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
            onClick={() => {
              onApply(order);
              onOpenChange(false);
            }}
          >
            Apply order
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
      <GameKindIcon game={item.game} className="size-5" />
      <span className="truncate text-sm">{item.puzzle.title}</span>
    </div>
  );
}
