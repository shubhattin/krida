import type { PadajalaPuzzleWord } from '~/db/schema_zod';
import type { AnveshiPuzzleData } from '~/util/anveshi/data';
import type { BhramitaPuzzleData } from '~/util/bhramita/data';
import type { DvayiPuzzleData } from '~/util/dvayi/data';
import type { SurupaPuzzleData } from '~/util/surupa/data';

/** One line of a puzzle's content, normalized across games for the admin details dialog. */
export type PuzzleEntry = {
  text: string;
  /** Secondary text: a clue, the matched pair, or the correct answer. */
  detail?: string;
  /** Present in the data but not shown to players (e.g. a word not added to the grid). */
  inactive?: boolean;
};

export type PuzzleEntries = {
  /** What one entry is called in this game, plural ("Words", "Pairs", "Questions"). */
  label: string;
  entries: PuzzleEntry[];
};

const nonBlank = (entry: PuzzleEntry) => entry.text.trim().length > 0;

export function padavaliEntries(wordList: { word: string; added: boolean }[]): PuzzleEntries {
  return {
    label: 'Words',
    entries: wordList.map((w) => ({ text: w.word, inactive: !w.added })).filter(nonBlank)
  };
}

export function padajalaEntries(wordList: PadajalaPuzzleWord[]): PuzzleEntries {
  return {
    label: 'Words',
    entries: wordList
      .map((w) => ({
        text: w.word_dev || w.word,
        detail: w.description || undefined,
        inactive: !w.added
      }))
      .filter(nonBlank)
  };
}

export function wordEntries(data: BhramitaPuzzleData | SurupaPuzzleData): PuzzleEntries {
  return {
    label: 'Words',
    entries: data.words.map((w) => ({ text: w.word })).filter(nonBlank)
  };
}

export function dvayiEntries(data: DvayiPuzzleData): PuzzleEntries {
  const right = new Map(data.right.map((item) => [item.id, item.text]));
  const matchedLeft = new Map(data.matches.map((m) => [m.leftId, right.get(m.rightId)]));
  return {
    label: 'Pairs',
    entries: data.left
      .map((item) => ({ text: item.text, detail: matchedLeft.get(item.id) }))
      .filter(nonBlank)
  };
}

export function anveshiEntries(data: AnveshiPuzzleData): PuzzleEntries {
  return {
    label: 'Questions',
    entries: data.questions
      .map((q) => ({
        text: q.prompt,
        detail: q.options.find((option) => option.id === q.correctOptionId)?.text
      }))
      .filter(nonBlank)
  };
}
