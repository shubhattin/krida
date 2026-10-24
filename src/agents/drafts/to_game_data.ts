import type { PadajalaPuzzleWord } from '~/db/schema_zod';
import type { AnveshiPuzzleData } from '~/util/anveshi/data';
import type { BhramitaPuzzleData } from '~/util/bhramita/data';
import type { DvayiPuzzleData } from '~/util/dvayi/data';
import type { SurupaPuzzleData } from '~/util/surupa/data';
import { createGameItemId } from '~/util/games/ids';
import { createEmptyGridData as createEmptyPadajalaGrid } from '~/util/padajala/grid';
import { splitDevanagariAksharas } from '~/util/puzzle/devanagari_syllables';
import { createEmptyGridData } from '~/util/puzzle/slug';
import type { PuzzleDraftByKind } from './schemas';

/** Same default the padajala editor opens with. */
export const PADAJALA_DRAFT_DIMENSIONS: [number, number] = [10, 10];

/**
 * Drafts become the exact rows the editors save. Grids stay empty on purpose: the admin lays
 * them out with the editor's generator, the same as a puzzle made with "Add puzzle".
 */
export const draftToGameData = {
  padavali: (draft: PuzzleDraftByKind['padavali']) => {
    const grid_dimensions: [number, number] = [draft.grid_rows, draft.grid_cols];
    return {
      word_list: draft.words.map((word) => ({ word: word.trim(), added: true })),
      grid_data: createEmptyGridData(grid_dimensions),
      grid_dimensions
    };
  },

  padajala: (draft: PuzzleDraftByKind['padajala']) => ({
    word_list: draft.words.map((entry): PadajalaPuzzleWord => ({
      word: normalizePadajalaAnswer(entry.answer),
      word_dev: entry.word_dev.trim(),
      description: entry.clue.trim(),
      added: true,
      location: [0, 0],
      direction: 'horizontal'
    })),
    grid_data: createEmptyPadajalaGrid(PADAJALA_DRAFT_DIMENSIONS),
    grid_dimensions: PADAJALA_DRAFT_DIMENSIONS
  }),

  dvayi: (draft: PuzzleDraftByKind['dvayi']): DvayiPuzzleData => {
    const rows = draft.pairs.map((pair) => ({
      left: { id: createGameItemId(), text: pair.left.trim() },
      right: { id: createGameItemId(), text: pair.right.trim() }
    }));
    return {
      left: rows.map((row) => row.left),
      right: rows.map((row) => row.right),
      matches: rows.map((row) => ({ leftId: row.left.id, rightId: row.right.id }))
    };
  },

  bhramita: (draft: PuzzleDraftByKind['bhramita']): BhramitaPuzzleData => ({
    words: draft.words.map((word) => ({
      id: createGameItemId(),
      word: word.trim(),
      syllables: splitDevanagariAksharas(word.trim())
    }))
  }),

  surupa: (draft: PuzzleDraftByKind['surupa']): SurupaPuzzleData => ({
    words: draft.words.map((entry) => ({
      id: createGameItemId(),
      word: entry.word.trim(),
      syllables: entry.aksharas.map((part) => part.akshara.trim()),
      alternatives: entry.aksharas.map((part) =>
        part.alternatives.map((item) => item.trim()).filter((item) => item.length > 0)
      )
    }))
  }),

  anveshi: (draft: PuzzleDraftByKind['anveshi']): AnveshiPuzzleData => ({
    questions: draft.questions.map((question) => {
      const options = question.options.map((text) => ({
        id: createGameItemId(),
        text: text.trim()
      }));
      return {
        id: createGameItemId(),
        prompt: question.prompt.trim(),
        hint: question.hint.trim(),
        explanation: question.explanation.trim(),
        options,
        correctOptionId: options[question.correct_option_index]?.id ?? ''
      };
    })
  })
};

export function normalizePadajalaAnswer(answer: string) {
  return answer.trim().toUpperCase().replace(/\s+/g, '');
}
