'use client';

import { useState } from 'react';
import { Image } from '@unpic/react';
import { Link, useRouter } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { atom, createStore, Provider, useAtom } from 'jotai';
import { ArrowLeftIcon, SquareArrowOutUpRight, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useTRPC } from '~/api/client';
import { AddGamesDialog } from '~/components/pages/catalog/AddGamesDialog';
import {
  GameKindIcon,
  PuzzleEditLink,
  gameKindLabel
} from '~/components/pages/catalog/GameKindIcon';
import { invalidateCatalogQueries } from '~/components/pages/catalog/invalidateCatalogQueries';
import { EditorActionDock } from '~/components/pages/puzzle/EditorActionDock';
import { Button } from '~/components/ui/button';
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
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { getCDNUrl } from '~/constants';
import {
  EditorHistoryProvider,
  useEditorHistoryActions,
  useHistoryTextField
} from '~/hooks/useEditorHistory';
import { normalizeTagSlug, type GameKind } from '~/util/catalog/tags';

type TagPuzzle = {
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

type TagData = {
  id: number;
  slug: string;
  puzzles: TagPuzzle[];
};

const itemKey = (item: { game: GameKind; puzzle: { id: number } }) =>
  `${item.game}:${item.puzzle.id}`;

const slug_atom = atom('');
const puzzles_atom = atom<TagPuzzle[]>([]);

const TAG_HISTORY_ATOMS = {
  slug: slug_atom,
  puzzles: puzzles_atom
};

function createTagStore(tag: TagData) {
  const store = createStore();
  store.set(slug_atom, tag.slug);
  store.set(puzzles_atom, tag.puzzles);
  return store;
}

export function TagEditPage({ slug }: { slug: string }) {
  const trpc = useTRPC();
  const tag_q = useQuery(trpc.catalog.get_tag.queryOptions({ slug }));
  const tag = tag_q.data;

  if (tag_q.isLoading) {
    return <p className="p-4 text-sm text-muted-foreground">Loading tag…</p>;
  }
  if (!tag) {
    return <p className="p-4 text-sm text-muted-foreground">Tag not found.</p>;
  }

  return <TagEditorShell key={tag.slug} tag={tag} />;
}

function TagEditorShell({ tag }: { tag: TagData }) {
  const [store] = useState(() => createTagStore(tag));

  return (
    <Provider store={store}>
      <EditorHistoryProvider atoms={TAG_HISTORY_ATOMS}>
        <TagEditorBody tag={tag} />
      </EditorHistoryProvider>
    </Provider>
  );
}

function TagEditorBody({ tag }: { tag: TagData }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 pb-28">
      <div className="flex items-center justify-between gap-2">
        <Link
          to="/tags/list"
          className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Back to tags
        </Link>
        <TagDeleteButton tagId={tag.id} slug={tag.slug} />
      </div>
      <TagMetaFields />
      <TagPuzzlesSection />
      <TagSaveDock tagId={tag.id} routeSlug={tag.slug} />
    </div>
  );
}

function TagMetaFields() {
  const [slug, setSlug] = useAtom(slug_atom);
  const slugHistory = useHistoryTextField();

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor="edit-tag-slug">Tag</Label>
      <Input
        id="edit-tag-slug"
        value={slug}
        onChange={(event) => setSlug(normalizeTagSlug(event.currentTarget.value))}
        onFocus={slugHistory.onFocus}
        onBlur={slugHistory.onBlur}
      />
    </div>
  );
}

function TagPuzzlesSection() {
  const [puzzles, setPuzzles] = useAtom(puzzles_atom);
  const [addOpen, setAddOpen] = useState(false);
  const { commit } = useEditorHistoryActions();

  const removeItem = (key: string) => {
    setPuzzles((current) => current.filter((item) => itemKey(item) !== key));
    commit();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Games</h2>
        <Button type="button" onClick={() => setAddOpen(true)}>
          Add games
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {puzzles.map((item) => (
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
            <PuzzleEditLink
              game={item.game}
              id={item.puzzle.id}
              className="min-w-0 flex-1 no-underline"
            >
              <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground hover:underline">
                <span className="truncate">{item.puzzle.title}</span>
                <SquareArrowOutUpRight
                  className="size-3 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {gameKindLabel(item.game)}
                {item.puzzle.description ? ` · ${item.puzzle.description}` : ''}
              </p>
              <span className="sr-only">Edit {item.puzzle.title} (opens in a new tab)</span>
            </PuzzleEditLink>
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
      {puzzles.length === 0 ? (
        <p className="text-sm text-muted-foreground">This tag is not on any games yet.</p>
      ) : null}
      <AddGamesDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        existingKeys={new Set(puzzles.map(itemKey))}
        onAdd={(picked) => {
          setPuzzles((current) => {
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
    </div>
  );
}

function TagDeleteButton({ tagId, slug }: { tagId: number; slug: string }) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [puzzles] = useAtom(puzzles_atom);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<'no' | 'yes'>('no');

  const padavaliCount = puzzles.filter((item) => item.game === 'padavali').length;
  const crosswordCount = puzzles.length - padavaliCount;
  const hasItems = puzzles.length > 0;

  const delete_mut = useMutation(
    trpc.catalog.delete_tag.mutationOptions({
      onSuccess: async () => {
        toast.success('Tag deleted');
        invalidateCatalogQueries(queryClient, trpc);
        await router.invalidate();
        await router.navigate({ to: '/tags/list' });
      },
      onError: (error) => toast.error(error.message || 'Could not delete tag')
    })
  );

  const close = (next: boolean) => {
    if (delete_mut.isPending) return;
    if (!next) setConfirm('no');
    setOpen(next);
  };

  const runDelete = () => delete_mut.mutate({ tag_id: tagId });
  const canDelete = !hasItems || confirm === 'yes';

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        Delete
      </Button>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete “{slug}”?</DialogTitle>
            <DialogDescription>
              {hasItems
                ? `This tag is on ${puzzles.length} game${puzzles.length === 1 ? '' : 's'} (${padavaliCount} Padavali · ${crosswordCount} Padajala). Deleting unlinks every game, but the puzzles themselves stay untouched. This cannot be undone.`
                : 'This tag is not on any games. Deleting removes it permanently. This cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          {hasItems ? (
            <RadioGroup
              value={confirm}
              onValueChange={(value) => setConfirm(value === 'yes' ? 'yes' : 'no')}
              className="gap-2.5"
              aria-label="Confirm tag deletion"
            >
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border/70 px-3 py-2 text-sm">
                <RadioGroupItem value="no" />
                No, keep the tag
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-destructive/50 px-3 py-2 text-sm font-medium">
                <RadioGroupItem value="yes" />
                Yes, delete this tag
              </label>
            </RadioGroup>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!canDelete || delete_mut.isPending}
              onClick={runDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TagSaveDock({ tagId, routeSlug }: { tagId: number; routeSlug: string }) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [slug] = useAtom(slug_atom);
  const [puzzles] = useAtom(puzzles_atom);
  const { beginSave, markSaved } = useEditorHistoryActions();

  const save_mut = useMutation(
    trpc.catalog.save_tag.mutationOptions({
      onSuccess: async (saved) => {
        markSaved();
        toast.success('Tag saved');
        invalidateCatalogQueries(queryClient, trpc);
        await router.invalidate();
        if (saved.slug !== routeSlug) {
          await router.navigate({
            to: '/tags/edit/$slug',
            params: { slug: saved.slug },
            replace: true
          });
        }
      },
      onError: (error) => toast.error(error.message || 'Could not save tag')
    })
  );

  const handleSave = () => {
    const trimmedSlug = slug.trim();
    if (!trimmedSlug) {
      toast.error('Tag is required');
      return;
    }
    beginSave();
    save_mut.mutate({
      tag_id: tagId,
      slug: trimmedSlug,
      puzzles: puzzles.map((item) => ({ game: item.game, puzzle_id: item.puzzle.id }))
    });
  };

  return <EditorActionDock onSave={handleSave} isSaving={save_mut.isPending} />;
}
