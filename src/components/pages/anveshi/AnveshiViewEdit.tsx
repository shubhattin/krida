'use client';

import { AnveshiEditor } from './AnveshiEditor';
import { createSimpleGameEditorAtoms } from '~/components/pages/simple_game/atoms';
import {
  SimpleGameViewEdit,
  type SimpleGameEditPuzzle
} from '~/components/pages/simple_game/SimpleGameViewEdit';
import type { EditorCollectionLink, EditorTag } from '~/components/pages/catalog/PuzzleCatalogFields';
import { emptyAnveshiPuzzleData, type AnveshiPuzzleData } from '~/util/anveshi/data';
import { analyzeAnveshiPuzzle } from '~/util/anveshi/validate';

const atoms = createSimpleGameEditorAtoms(emptyAnveshiPuzzleData());

export function AnveshiViewEdit({
  puzzle,
  catalog
}: {
  puzzle: SimpleGameEditPuzzle<AnveshiPuzzleData>;
  catalog: { tags: EditorTag[]; collections: EditorCollectionLink[] };
}) {
  return (
    <SimpleGameViewEdit
      kind="anveshi"
      puzzle={puzzle}
      catalog={catalog}
      atoms={atoms}
      analyze={analyzeAnveshiPuzzle}
    >
      <AnveshiEditor dataAtom={atoms.puzzleData} lipiAtom={atoms.lipi} />
    </SimpleGameViewEdit>
  );
}
