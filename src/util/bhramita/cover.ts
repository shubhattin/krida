import type { BhramitaPuzzleData } from './data';

/** Cover-image prompt context: the words being unscrambled. */
export function bhramitaCoverWords(data: BhramitaPuzzleData): string[] {
  return data.words.map((entry) => entry.word.trim()).filter(Boolean);
}
