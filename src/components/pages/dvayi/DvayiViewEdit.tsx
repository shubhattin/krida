'use client';

import { DvayiEditor } from './DvayiEditor';
import { createSimpleGameEditorAtoms } from '~/components/pages/simple_game/atoms';
import {
  SimpleGameViewEdit,
  type SimpleGameEditPuzzle
} from '~/components/pages/simple_game/SimpleGameViewEdit';
import type {
  EditorCollectionLink,
  EditorTag
} from '~/components/pages/catalog/PuzzleCatalogFields';
import { emptyDvayiPuzzleData, type DvayiPuzzleData } from '~/util/dvayi/data';
import { analyzeDvayiPuzzle } from '~/util/dvayi/validate';

const atoms = createSimpleGameEditorAtoms(emptyDvayiPuzzleData());

export function DvayiViewEdit({
  puzzle,
  catalog
}: {
  puzzle: SimpleGameEditPuzzle<DvayiPuzzleData>;
  catalog: { tags: EditorTag[]; collections: EditorCollectionLink[] };
}) {
  return (
    <SimpleGameViewEdit
      kind="dvayi"
      puzzle={puzzle}
      catalog={catalog}
      atoms={atoms}
      analyze={analyzeDvayiPuzzle}
    >
      <DvayiEditor dataAtom={atoms.puzzleData} lipiAtom={atoms.lipi} />
    </SimpleGameViewEdit>
  );
}
