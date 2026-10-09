import { splitDevanagariAksharas } from '~/util/puzzle/devanagari_syllables';
import type { SurupaPuzzleData, SurupaWord } from './data';

/** Keep existing distractors aligned with the newly extracted syllables. */
export function inferSurupaWord(word: SurupaWord): SurupaWord {
  const syllables = splitDevanagariAksharas(word.word);
  const alternatives = syllables.map((_, index) => {
    const current = word.alternatives[index] ?? [];
    return current.map((item) => item.trim()).filter((item) => item.length > 0);
  });
  return { ...word, syllables, alternatives };
}

export function inferSurupaPuzzleData(data: SurupaPuzzleData): SurupaPuzzleData {
  return { words: data.words.map(inferSurupaWord) };
}
