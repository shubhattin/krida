'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useAtom } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';
import { SimpleGameEditShell, type SimpleGameEditorAtoms } from './SimpleGameEditShell';
import {
  puzzle_collections_atom,
  puzzle_tags_atom,
  type EditorCollectionLink,
  type EditorTag
} from '~/components/pages/catalog/PuzzleCatalogFields';
import { SimpleGameAnalytics } from './SimpleGameAnalytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import type { GameAnalysis } from '~/util/games/issues';
import type { SimpleGameKind } from '~/util/games/kinds';
import type { EditableAttachment } from './SimpleGameAttachments';
import type { attachment_list_type } from '~/db/db_shared_vals';

export type SimpleGameEditPuzzle<T> = {
  id: number;
  uid: string;
  slug: string;
  title: string;
  description: string;
  listed: boolean;
  puzzle_data: T;
  attachments: {
    id: number;
    type: attachment_list_type;
    url: string;
    title: string | null;
    order_index: number;
  }[];
};

export function SimpleGameViewEdit<T>({
  kind,
  puzzle,
  catalog,
  atoms,
  analyze,
  children
}: {
  kind: SimpleGameKind;
  puzzle: SimpleGameEditPuzzle<T>;
  catalog: { tags: EditorTag[]; collections: EditorCollectionLink[] };
  atoms: SimpleGameEditorAtoms<T>;
  analyze: (data: T) => GameAnalysis;
  children: ReactNode;
}) {
  const [slug, setSlug] = useState(puzzle.slug);
  const attachments: EditableAttachment[] = puzzle.attachments.map((attachment) => ({
    id: attachment.id,
    type: attachment.type,
    url: attachment.url,
    title: attachment.title,
    order_index: attachment.order_index
  }));

  useHydrateAtoms([
    [atoms.title, puzzle.title],
    [atoms.description, puzzle.description],
    [atoms.listed, puzzle.listed],
    [atoms.puzzleData, puzzle.puzzle_data],
    [atoms.attachments, attachments],
    [atoms.lipi, true],
    [puzzle_tags_atom, catalog.tags],
    [puzzle_collections_atom, catalog.collections]
  ]);

  return (
    <HydratedEdit
      kind={kind}
      puzzleId={puzzle.id}
      slug={slug}
      onSlugUpdated={setSlug}
      atoms={atoms}
      analyze={analyze}
    >
      {children}
    </HydratedEdit>
  );
}

function HydratedEdit<T>({
  kind,
  puzzleId,
  slug,
  onSlugUpdated,
  atoms,
  analyze,
  children
}: {
  kind: SimpleGameKind;
  puzzleId: number;
  slug: string;
  onSlugUpdated: (slug: string) => void;
  atoms: SimpleGameEditorAtoms<T>;
  analyze: (data: T) => GameAnalysis;
  children: ReactNode;
}) {
  const [puzzleData] = useAtom(atoms.puzzleData);
  const analysis = useMemo(() => analyze(puzzleData), [analyze, puzzleData]);

  return (
    <Tabs defaultValue="edit">
      <TabsList>
        <TabsTrigger value="edit">Edit</TabsTrigger>
        <TabsTrigger value="stats">Puzzle Stats</TabsTrigger>
      </TabsList>
      <TabsContent value="edit">
        <SimpleGameEditShell
          kind={kind}
          puzzleId={puzzleId}
          slug={slug}
          onSlugUpdated={onSlugUpdated}
          atoms={atoms}
          analysis={analysis}
        >
          {children}
        </SimpleGameEditShell>
      </TabsContent>
      <TabsContent value="stats">
        <SimpleGameAnalytics kind={kind} lockedPuzzleId={puzzleId} />
      </TabsContent>
    </Tabs>
  );
}
