import type { SurupaPuzzleData } from './data';

/** Cover-image prompt context: the correct spellings only — never the misspelt alternatives. */
export function surupaCoverWords(data: SurupaPuzzleData): string[] {
  return data.words.map((entry) => entry.word.trim()).filter(Boolean);
}
