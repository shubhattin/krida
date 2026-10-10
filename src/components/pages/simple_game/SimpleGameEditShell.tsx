'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtom, type PrimitiveAtom } from 'jotai';
import { toast } from 'sonner';
import {
  clearTypingContextOnKeyDown,
  createTypingContext,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';
import { useTRPC } from '~/api/client';
import {
  PuzzleCatalogFields,
  puzzle_collections_atom,
  puzzle_tags_atom
} from '~/components/pages/catalog/PuzzleCatalogFields';
import { isLipiToggleKey, LipiLekhikaSwitch } from '~/components/puzzle/LipiLekhikaSwitch';
import { invalidateCatalogQueries } from '~/components/pages/catalog/invalidateCatalogQueries';
import { EditorActionDock } from '~/components/pages/puzzle/EditorActionDock';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import { Textarea } from '~/components/ui/textarea';
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
  EditorHistoryProvider,
  useEditorHistoryActions,
  useHistoryTextField
} from '~/hooks/useEditorHistory';
import type { GameAnalysis } from '~/util/games/issues';
import { SIMPLE_GAME_META, simpleGameListHref, type SimpleGameKind } from '~/util/games/kinds';
import { SimpleGameAttachments, type EditableAttachment } from './SimpleGameAttachments';
import { SimpleGameIssues } from './SimpleGameIssues';
import { SimpleGameSlugField } from './SimpleGameSlugField';

export type SimpleGameEditorAtoms<T> = {
  title: PrimitiveAtom<string>;
  description: PrimitiveAtom<string>;
  listed: PrimitiveAtom<boolean>;
  puzzleData: PrimitiveAtom<T>;
  attachments: PrimitiveAtom<EditableAttachment[]>;
  lipi: PrimitiveAtom<boolean>;
};

export function SimpleGameEditShell<T>({
  kind,
  puzzleId,
  slug,
  onSlugUpdated,
  atoms,
  analysis,
  children
}: {
  kind: SimpleGameKind;
  puzzleId: number;
  slug: string;
  onSlugUpdated: (slug: string) => void;
  atoms: SimpleGameEditorAtoms<T>;
  analysis: GameAnalysis;
  children: ReactNode;
}) {
  const historyAtoms = {
    title: atoms.title,
    description: atoms.description,
    listed: atoms.listed,
    puzzleData: atoms.puzzleData,
    attachments: atoms.attachments,
    tags: puzzle_tags_atom,
    collections: puzzle_collections_atom
  };

  return (
    <EditorHistoryProvider atoms={historyAtoms}>
      <SimpleGameEditBody
        kind={kind}
        puzzleId={puzzleId}
        slug={slug}
        onSlugUpdated={onSlugUpdated}
        atoms={atoms}
        analysis={analysis}
      >
        {children}
      </SimpleGameEditBody>
    </EditorHistoryProvider>
  );
}

function SimpleGameEditBody<T>({
  kind,
  puzzleId,
  slug,
  onSlugUpdated,
  atoms,
  analysis,
  children
}: {
  kind: SimpleGameKind;
  puzzleId: number;
  slug: string;
  onSlugUpdated: (slug: string) => void;
  atoms: SimpleGameEditorAtoms<T>;
  analysis: GameAnalysis;
  children: ReactNode;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { commit, beginSave, markSaved } = useEditorHistoryActions();
  const [title, setTitle] = useAtom(atoms.title);
  const [description, setDescription] = useAtom(atoms.description);
  const [listed, setListed] = useAtom(atoms.listed);
  const [puzzleData] = useAtom(atoms.puzzleData);
  const [attachments, setAttachments] = useAtom(atoms.attachments);
  const [tags] = useAtom(puzzle_tags_atom);
  const [collections] = useAtom(puzzle_collections_atom);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [titleLipi, setTitleLipi] = useState(true);
  const [descriptionLipi, setDescriptionLipi] = useState(false);
  const titleField = useHistoryTextField();
  const descriptionField = useHistoryTextField();
  const titleTyping = useMemo(() => createTypingContext('Devanagari'), []);
  const descriptionTyping = useMemo(() => createTypingContext('Devanagari'), []);
  const meta = SIMPLE_GAME_META[kind];

  const sync_catalog_mut = useMutation(trpc.catalog.set_puzzle_links.mutationOptions());

  const save_mut = useMutation(
    trpc[kind].update_puzzle.mutationOptions({
      onSuccess: async (data) => {
        if (data.newly_added_index_ids.length > 0) {
          setAttachments((prev) =>
            prev.map((attachment, index) => {
              const added = data.newly_added_index_ids.find((row) => row.index === index);
              return added ? { ...attachment, id: added.id } : attachment;
            })
          );
        }
        try {
          await sync_catalog_mut.mutateAsync({
            game: kind,
            puzzle_id: puzzleId,
            tag_slugs: tags.map((tag) => tag.slug),
            collection_uids: collections.map((collection) => collection.uid)
          });
        } catch {
          toast.error('Puzzle saved, but tags/collections failed to sync');
        }
        invalidateCatalogQueries(queryClient, trpc);
        markSaved();
        toast.success('Saved');
      },
      onError: (error) => {
        toast.error(error.message || 'Could not save');
      }
    })
  );

  const delete_mut = useMutation(
    trpc[kind].delete_puzzle.mutationOptions({
      onSuccess: () => {
        toast.success('Puzzle deleted');
        window.location.assign(simpleGameListHref(kind));
      },
      onError: () => toast.error('Could not delete puzzle')
    })
  );

  const handleSave = () => {
    if (!analysis.canSave) {
      toast.error(analysis.errors[0]?.message ?? 'Fix errors before saving');
      return;
    }
    if (listed && !analysis.canList) {
      toast.error('Cannot list this puzzle until listing warnings are resolved');
      return;
    }
    if (!title.trim() || !description.trim()) {
      toast.error('Title and description are required');
      return;
    }
    beginSave();
    save_mut.mutate({
      puzzle_id: puzzleId,
      puzzle_slug: slug,
      puzzle_data: {
        title: title.trim(),
        description: description.trim(),
        listed,
        game_data: puzzleData,
        attachments: attachments.filter((attachment) => attachment.url.trim().length > 0)
      }
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-2 py-4 pb-28 sm:px-4">
      <SimpleGameSlugField
        kind={kind}
        puzzleId={puzzleId}
        slug={slug}
        onSlugUpdated={onSlugUpdated}
      />
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`${kind}-edit-title`}>Title</Label>
          <LipiLekhikaSwitch
            checked={titleLipi}
            onCheckedChange={setTitleLipi}
            label="Lipi Lekhika for title"
          />
        </div>
        <Input
          id={`${kind}-edit-title`}
          value={title}
          className="text-lg font-semibold"
          {...titleField}
          onChange={(event) => setTitle(event.currentTarget.value)}
          onBeforeInput={(event) =>
            handleTypingBeforeInputEvent(titleTyping, event, setTitle, titleLipi)
          }
          onBlur={() => {
            titleField.onBlur();
            titleTyping.clearContext();
            commit();
          }}
          onKeyDown={(event) => {
            if (isLipiToggleKey(event)) {
              event.preventDefault();
              setTitleLipi((prev) => !prev);
            }
            clearTypingContextOnKeyDown(event, titleTyping);
          }}
        />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`${kind}-edit-description`}>Description</Label>
          <LipiLekhikaSwitch
            checked={descriptionLipi}
            onCheckedChange={setDescriptionLipi}
            label="Lipi Lekhika for description"
          />
        </div>
        <Textarea
          id={`${kind}-edit-description`}
          value={description}
          rows={3}
          {...descriptionField}
          onChange={(event) => setDescription(event.currentTarget.value)}
          onBeforeInput={(event) =>
            handleTypingBeforeInputEvent(descriptionTyping, event, setDescription, descriptionLipi)
          }
          onBlur={() => {
            descriptionField.onBlur();
            descriptionTyping.clearContext();
            commit();
          }}
          onKeyDown={(event) => {
            if (isLipiToggleKey(event)) {
              event.preventDefault();
              setDescriptionLipi((prev) => !prev);
            }
            clearTypingContextOnKeyDown(event, descriptionTyping);
          }}
        />
      </div>
      <PuzzleCatalogFields />
      <div className="flex flex-wrap items-center gap-4">
        <Label className="inline-flex items-center gap-2">
          <Switch
            checked={listed}
            onCheckedChange={(next) => {
              if (next && !analysis.canList) {
                toast.error('Resolve listing issues before publishing');
                return;
              }
              setListed(next);
              commit();
            }}
          />
          Listed
        </Label>
        <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
          Delete
        </Button>
      </div>
      <SimpleGameIssues analysis={analysis} />
      {children}
      <SimpleGameAttachments atom={atoms.attachments} />
      <EditorActionDock onSave={handleSave} isSaving={save_mut.isPending} />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {meta.name} puzzle?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The puzzle, attachments, and play stats will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={delete_mut.isPending}
              onClick={() => delete_mut.mutate({ id: puzzleId, slug })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
