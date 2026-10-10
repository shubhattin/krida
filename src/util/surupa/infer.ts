import { splitDevanagariAksharas } from '~/util/puzzle/devanagari_syllables';
import type { SurupaPuzzleData, SurupaWord } from './data';

/** Align distractor lists with extracted syllables. Empty drafts stay in place. */
export function alignSurupaWord(word: SurupaWord): SurupaWord {
  const syllables = splitDevanagariAksharas(word.word);
  const alternatives = syllables.map((_, index) => [...(word.alternatives[index] ?? [])]);
  return { ...word, syllables, alternatives };
}

export function alignSurupaPuzzleData(data: SurupaPuzzleData): SurupaPuzzleData {
  return { words: data.words.map(alignSurupaWord) };
}

/** Keep existing distractors aligned, dropping blank drafts for play/save. */
export function inferSurupaWord(word: SurupaWord): SurupaWord {
  const aligned = alignSurupaWord(word);
  return {
    ...aligned,
    alternatives: aligned.alternatives.map((list) =>
      list.map((item) => item.trim()).filter((item) => item.length > 0)
    )
  };
}

export function inferSurupaPuzzleData(data: SurupaPuzzleData): SurupaPuzzleData {
  return { words: data.words.map(inferSurupaWord) };
}
