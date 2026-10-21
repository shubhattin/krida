'use client';

import { SurupaEditor } from './SurupaEditor';
import { surupaCoverWords } from '~/util/surupa/cover';
import { createSimpleGameEditorAtoms } from '~/components/pages/simple_game/atoms';
import {
  SimpleGameViewEdit,
  type SimpleGameEditPuzzle
} from '~/components/pages/simple_game/SimpleGameViewEdit';
import type {
  EditorCollectionLink,
  EditorTag
} from '~/components/pages/catalog/PuzzleCatalogFields';
import { emptySurupaPuzzleData, type SurupaPuzzleData } from '~/util/surupa/data';
import { analyzeSurupaPuzzle } from '~/util/surupa/validate';

const cover = { words: surupaCoverWords, wordsLabel: 'Include the words' };

const atoms = createSimpleGameEditorAtoms(emptySurupaPuzzleData());

export function SurupaViewEdit({
  puzzle,
  catalog
}: {
  puzzle: SimpleGameEditPuzzle<SurupaPuzzleData>;
  catalog: { tags: EditorTag[]; collections: EditorCollectionLink[] };
}) {
  return (
    <SimpleGameViewEdit
      kind="surupa"
      puzzle={puzzle}
      catalog={catalog}
      atoms={atoms}
      cover={cover}
      analyze={analyzeSurupaPuzzle}
    >
      <SurupaEditor dataAtom={atoms.puzzleData} lipiAtom={atoms.lipi} />
    </SimpleGameViewEdit>
  );
}
