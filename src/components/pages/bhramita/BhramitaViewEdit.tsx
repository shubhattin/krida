'use client';

import { BhramitaEditor } from './BhramitaEditor';
import { bhramitaCoverWords } from '~/util/bhramita/cover';
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

const cover = { words: bhramitaCoverWords, wordsLabel: 'Include the words' };

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
      cover={cover}
      analyze={analyzeBhramitaPuzzle}
    >
      <BhramitaEditor dataAtom={atoms.puzzleData} lipiAtom={atoms.lipi} />
    </SimpleGameViewEdit>
  );
}
