import type { PadavaliListedPuzzlesType } from '~/util/cache.server/padavali_cache';

export const NORMAL_TITLE_SCRIPT = 'Normal' as const;
export const PUZZLE_CARD_IMAGE_ASPECT_RATIO = [3, 2] as const;

export type ListedPuzzle = PadavaliListedPuzzlesType[number];

export type DisplayPuzzle = ListedPuzzle & {
  description_original: string;
  title_normal: string;
};

export function mapListedPuzzlesForDisplay(
  org: PadavaliListedPuzzlesType,
  transliterated_texts: string[],
  normal_titles: string[]
): DisplayPuzzle[] {
  const expected_text_count = org.reduce(
    (sum, puzzle) => sum + 1 + (puzzle.description ? 1 : 0),
    0
  );
  if (transliterated_texts.length !== expected_text_count) {
    throw new Error(
      `Expected ${expected_text_count} transliterated texts, got ${transliterated_texts.length}`
    );
  }
  if (normal_titles.length !== org.length) {
    throw new Error(`Expected ${org.length} normal titles, got ${normal_titles.length}`);
  }

  let text_i = 0;
  return org.map((puzzle, index) => ({
    ...puzzle,
    title: transliterated_texts[text_i++]!,
    description: puzzle.description ? transliterated_texts[text_i++]! : '',
    description_original: puzzle.description,
    title_normal: normal_titles[index]!
  }));
}

export function mergeDisplayPuzzles(
  rows: DisplayPuzzle[],
  org: PadavaliListedPuzzlesType,
  normal_titles: string[] | undefined
): DisplayPuzzle[] {
  const byId = new Map(rows.map((row) => [row.id, row]));

  return org.map((puzzle, index) => {
    const row = byId.get(puzzle.id) ?? rows[index];
    return {
      ...puzzle,
      title: row?.title ?? puzzle.title,
      description: row?.description ?? puzzle.description ?? '',
      description_original: puzzle.description,
      title_normal: row?.title_normal ?? normal_titles?.[index] ?? ''
    };
  });
}
