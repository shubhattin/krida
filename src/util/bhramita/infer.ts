import { splitDevanagariAksharas } from '~/util/puzzle/devanagari_syllables';
import type { BhramitaPuzzleData } from './data';

/** Recompute syllables from the current word spelling. */
export function inferBhramitaPuzzleData(data: BhramitaPuzzleData): BhramitaPuzzleData {
  return {
    words: data.words.map((entry) => ({
      ...entry,
      syllables: splitDevanagariAksharas(entry.word)
    }))
  };
}

export function shuffleSyllables(syllables: readonly string[]): string[] {
  if (syllables.length < 2) return [...syllables];
  const maxAttempts = 12;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const next = [...syllables];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const current = next[i]!;
      next[i] = next[j]!;
      next[j] = current;
    }
    if (next.join('') !== syllables.join('')) return next;
  }
  return [...syllables].toReversed();
}
