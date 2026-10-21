'use client';

import { AnveshiEditor } from './AnveshiEditor';
import { anveshiCoverWords } from '~/util/anveshi/cover';
import { createSimpleGameEditorAtoms } from '~/components/pages/simple_game/atoms';
import {
  SimpleGameViewEdit,
  type SimpleGameEditPuzzle
} from '~/components/pages/simple_game/SimpleGameViewEdit';
import type {
  EditorCollectionLink,
  EditorTag
} from '~/components/pages/catalog/PuzzleCatalogFields';
import { emptyAnveshiPuzzleData, type AnveshiPuzzleData } from '~/util/anveshi/data';
import { analyzeAnveshiPuzzle } from '~/util/anveshi/validate';

const cover = { words: anveshiCoverWords, wordsLabel: 'Include questions and answers' };

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
      cover={cover}
      analyze={analyzeAnveshiPuzzle}
    >
      <AnveshiEditor dataAtom={atoms.puzzleData} lipiAtom={atoms.lipi} />
    </SimpleGameViewEdit>
  );
}
