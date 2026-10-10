'use client';

import { BhramitaEditor } from './BhramitaEditor';
import { createSimpleGameEditorAtoms } from '~/components/pages/simple_game/atoms';
import {
  SimpleGameViewEdit,
  type SimpleGameEditPuzzle
} from '~/components/pages/simple_game/SimpleGameViewEdit';
import type {
  EditorCollectionLink,
  EditorTag
} from '~/components/pages/catalog/PuzzleCatalogFields';
import { emptyBhramitaPuzzleData, type BhramitaPuzzleData } from '~/util/bhramita/data';
import { analyzeBhramitaPuzzle } from '~/util/bhramita/validate';

const atoms = createSimpleGameEditorAtoms(emptyBhramitaPuzzleData());

export function BhramitaViewEdit({
  puzzle,
  catalog
}: {
  puzzle: SimpleGameEditPuzzle<BhramitaPuzzleData>;
  catalog: { tags: EditorTag[]; collections: EditorCollectionLink[] };
}) {
  return (
    <SimpleGameViewEdit
      kind="bhramita"
      puzzle={puzzle}
      catalog={catalog}
      atoms={atoms}
      analyze={analyzeBhramitaPuzzle}
    >
      <BhramitaEditor dataAtom={atoms.puzzleData} lipiAtom={atoms.lipi} />
    </SimpleGameViewEdit>
  );
}
