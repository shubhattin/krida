import type { DvayiPuzzleData } from './data';
import { inferDvayiPuzzleData } from './infer';

/** Cover-image prompt context: each matched pair as "left — right". */
export function dvayiCoverWords(data: DvayiPuzzleData): string[] {
  const inferred = inferDvayiPuzzleData(data);
  const text = (items: DvayiPuzzleData['left'], id: string) =>
    items.find((item) => item.id === id)?.text.trim() ?? '';
  return inferred.matches
    .map((match) => [text(inferred.left, match.leftId), text(inferred.right, match.rightId)])
    .filter(([left, right]) => left && right)
    .map(([left, right]) => `${left} — ${right}`);
}
