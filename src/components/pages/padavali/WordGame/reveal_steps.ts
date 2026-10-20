import type { CellPosition, RevealedWord } from './game_state';

/**
 * Most akṣaras a progressive reveal will show for a word. The last one is never
 * revealed so the player still makes the final swipe themselves.
 */
export const maxRevealSteps = (pathLength: number) => Math.max(1, pathLength - 1);

const isExhausted = (revealed: RevealedWord) =>
  revealed.cells.length >= maxRevealSteps(revealed.fullPath.length);

/** The current reveal target, or null once it has been found. */
const activeTarget = (revealed: RevealedWord | null, remainingWords: string[]) =>
  revealed && remainingWords.includes(revealed.word) ? revealed : null;

/** Whether another प्रकाशयतु press would show anything new. */
export function canRevealMore(revealed: RevealedWord | null, remainingWords: string[]) {
  if (remainingWords.length === 0) return false;
  const target = activeTarget(revealed, remainingWords);
  return !(target && isExhausted(target) && remainingWords.length === 1);
}

/**
 * Next progressive reveal state: grows the current target by one akṣara, or —
 * when there is no target or it is exhausted — starts a new word at its first akṣara.
 * Returns null when nothing more can be revealed.
 */
export function nextRevealState(
  revealed: RevealedWord | null,
  remainingWords: string[],
  pickPath: (word: string) => CellPosition[] | null,
  random: () => number = Math.random
): RevealedWord | null {
  if (!canRevealMore(revealed, remainingWords)) return null;
  const target = activeTarget(revealed, remainingWords);

  if (target && !isExhausted(target)) {
    return {
      ...target,
      cells: target.fullPath.slice(0, target.cells.length + 1),
      animateFrom: target.cells.length
    };
  }

  const candidates = target ? remainingWords.filter((w) => w !== target.word) : remainingWords;
  const word = candidates[Math.floor(random() * candidates.length)]!;
  const fullPath = pickPath(word);
  if (!fullPath || fullPath.length === 0) return null;
  return { word, fullPath, cells: fullPath.slice(0, 1), animateFrom: 0 };
}

/** Short English clue from an AI meaning, dropping the leading "Word —" echo. */
export function clueFromMeaning(meaning: string) {
  const dash = meaning.indexOf('—');
  const body = dash >= 0 && dash < 60 ? meaning.slice(dash + 1).trim() : meaning.trim();
  const firstSentence = body.split(/(?<=\.)\s/)[0] ?? body;
  return firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1);
}
