'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RotateCcwIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useTRPC } from '~/api/client';
import {
  CollectionsInput,
  type EditorCollectionLink,
  type EditorTag,
  TagsInput
} from '~/components/pages/catalog/PuzzleCatalogFields';
import { invalidateCatalogQueries } from '~/components/pages/catalog/invalidateCatalogQueries';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog';
import { Spinner } from '~/components/ui/spinner';
import { cn } from '~/lib/utils';
import type { GameKind } from '~/util/catalog/tags';
import { gameKindLabel } from '~/util/games/labels';
import type { AdminPuzzleRow } from './puzzle_table_columns';

type LinksDraft = { tags: EditorTag[]; collections: EditorCollectionLink[] };

const originalLinks = (puzzle: AdminPuzzleRow): LinksDraft => ({
  tags: puzzle.tags ?? [],
  collections: puzzle.collections ?? []
});

const sameKeys = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((key) => set.has(key));
};

const isChanged = (puzzle: AdminPuzzleRow, draft: LinksDraft | undefined) => {
  if (!draft) return false;
  const original = originalLinks(puzzle);
  return (
    !sameKeys(
      original.tags.map((tag) => tag.slug),
      draft.tags.map((tag) => tag.slug)
    ) ||
    !sameKeys(
      original.collections.map((link) => link.uid),
      draft.collections.map((link) => link.uid)
    )
  );
};

/** Edit tags and collections of every puzzle in the table at once; saves only changed rows. */
export function EditPuzzleLinksDialog({
  game,
  puzzles,
  open,
  onOpenChange
}: {
  game: GameKind;
  puzzles: AdminPuzzleRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  /** Edits keyed by puzzle id; untouched puzzles fall back to their row data. */
  const [drafts, setDrafts] = useState<Map<number, LinksDraft>>(() => new Map());

  const changed = puzzles.filter((puzzle) => isChanged(puzzle, drafts.get(puzzle.id)));

  const updateDraft = (puzzle: AdminPuzzleRow, patch: Partial<LinksDraft>) => {
    setDrafts((current) => {
      const next = new Map(current);
      next.set(puzzle.id, { ...(current.get(puzzle.id) ?? originalLinks(puzzle)), ...patch });
      return next;
    });
  };

  const resetDraft = (puzzleId: number) => {
    setDrafts((current) => {
      const next = new Map(current);
      next.delete(puzzleId);
      return next;
    });
  };

  const save_mut = useMutation(trpc.catalog.set_puzzle_links_batch.mutationOptions());

  const save = async () => {
    if (changed.length === 0 || save_mut.isPending) return;
    // The batch route caps at 500 items; full lists can be larger, so chunk.
    const BATCH_SIZE = 100;
    try {
      let updated = 0;
      for (let i = 0; i < changed.length; i += BATCH_SIZE) {
        const chunk = changed.slice(i, i + BATCH_SIZE);
        const data = await save_mut.mutateAsync({
          game,
          items: chunk.map((puzzle) => {
            const draft = drafts.get(puzzle.id)!;
            return {
              puzzle_id: puzzle.id,
              tag_slugs: draft.tags.map((tag) => tag.slug),
              collection_uids: draft.collections.map((link) => link.uid)
            };
          })
        });
        updated += data.updated;
      }
      invalidateCatalogQueries(queryClient, trpc);
      // Simple games' admin lists aren't covered by the catalog invalidation.
      void queryClient.invalidateQueries({ queryKey: [`${game}_list`] });
      void queryClient.invalidateQueries({ queryKey: [`${game}_list_full`] });
      toast.success(`Updated ${updated} puzzle${updated === 1 ? '' : 's'}`);
      setDrafts(new Map());
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save tags and collections');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (save_mut.isPending) return;
        if (!next) setDrafts(new Map());
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex h-[85vh] flex-col sm:max-w-5xl">
        <DialogHeader className="pr-8">
          <DialogTitle>{gameKindLabel(game)} — tags & collections</DialogTitle>
          <DialogDescription>
            {puzzles.length} puzzle{puzzles.length === 1 ? '' : 's'} from the current list. Only
            changed puzzles are saved; new collection members are appended to the end.
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-4 min-h-0 flex-1 overflow-y-auto border-y border-border/60">
          <div className="hidden grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,1fr)_2rem] gap-3 border-b border-border/60 bg-muted/40 px-4 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase md:grid">
            <span>Puzzle</span>
            <span>Tags</span>
            <span>Collections</span>
          </div>
          <ul className="divide-y divide-border/60">
            {puzzles.map((puzzle) => {
              const draft = drafts.get(puzzle.id);
              const value = draft ?? originalLinks(puzzle);
              const dirty = isChanged(puzzle, draft);
              return (
                <li
                  key={puzzle.id}
                  className={cn(
                    'grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,1fr)_2rem] md:items-start',
                    dirty && 'bg-amber-500/5'
                  )}
                >
                  <div className="min-w-0 pt-1">
                    <div className="flex items-center gap-1.5">
                      {dirty ? (
                        <span
                          className="size-1.5 shrink-0 rounded-full bg-amber-500"
                          title="Changed"
                        />
                      ) : null}
                      <span className="truncate text-sm font-medium" title={puzzle.title}>
                        {puzzle.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate font-mono" title={puzzle.slug}>
                        {puzzle.slug}
                      </span>
                      <span
                        className={cn(
                          'shrink-0',
                          puzzle.listed && 'text-emerald-700 dark:text-emerald-300'
                        )}
                      >
                        {puzzle.listed ? 'Listed' : 'Draft'}
                      </span>
                    </div>
                  </div>
                  <TagsInput
                    value={value.tags}
                    onChange={(tags) => updateDraft(puzzle, { tags })}
                  />
                  <CollectionsInput
                    value={value.collections}
                    onChange={(collections) => updateDraft(puzzle, { collections })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className={cn('mt-1', !dirty && 'invisible')}
                    aria-label={`Revert ${puzzle.title}`}
                    title="Revert"
                    onClick={() => resetDraft(puzzle.id)}
                  >
                    <RotateCcwIcon />
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
        <DialogFooter className="items-center sm:justify-between">
          <p className="text-sm text-muted-foreground tabular-nums">
            {changed.length === 0
              ? 'No changes'
              : `${changed.length} puzzle${changed.length === 1 ? '' : 's'} changed`}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={save_mut.isPending}
              onClick={() => {
                setDrafts(new Map());
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={changed.length === 0 || save_mut.isPending}
              onClick={save}
            >
              {save_mut.isPending ? <Spinner /> : null}
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
