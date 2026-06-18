import type { ListedPuzzlesType } from '~/util/cache.server/cache_loaders';

export const NORMAL_TITLE_SCRIPT = 'Normal' as const;
export const PUZZLE_CARD_IMAGE_ASPECT_RATIO = [3, 2] as const;

export type ListedPuzzle = ListedPuzzlesType[number];

export type DisplayPuzzle = ListedPuzzle & {
  description_original: string | null;
  title_normal: string;
};

export function mapListedPuzzlesForDisplay(
  org: ListedPuzzlesType,
  transliterated_texts: string[],
  normal_titles: string[]
): DisplayPuzzle[] {
  let text_i = 0;
  return org.map((puzzle, index) => ({
    ...puzzle,
    title: transliterated_texts[text_i++]!,
    description: puzzle.description ? transliterated_texts[text_i++]! : null,
    description_original: puzzle.description,
    title_normal: normal_titles[index]!
  }));
}

export function mergeDisplayPuzzles(
  rows: DisplayPuzzle[],
  org: ListedPuzzlesType,
  normal_titles: string[] | undefined
): DisplayPuzzle[] {
  return rows.map((puzzle, index) => ({
    ...puzzle,
    description_original:
      'description_original' in puzzle && puzzle.description_original != null
        ? puzzle.description_original
        : (org[index]?.description ?? null),
    title_normal: puzzle.title_normal ?? normal_titles?.[index] ?? ''
  }));
}
