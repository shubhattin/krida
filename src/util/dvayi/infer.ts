import type { DvayiPuzzleData } from './data';

/**
 * Drop match rows whose endpoints no longer exist, and unique-ify left/right.
 * Column text is left as the author typed it.
 */
export function inferDvayiPuzzleData(data: DvayiPuzzleData): DvayiPuzzleData {
  const leftIds = new Set(data.left.map((item) => item.id));
  const rightIds = new Set(data.right.map((item) => item.id));
  const usedLeft = new Set<string>();
  const usedRight = new Set<string>();
  const matches = [];

  for (const match of data.matches) {
    if (!leftIds.has(match.leftId) || !rightIds.has(match.rightId)) continue;
    if (usedLeft.has(match.leftId) || usedRight.has(match.rightId)) continue;
    usedLeft.add(match.leftId);
    usedRight.add(match.rightId);
    matches.push(match);
  }

  return {
    left: data.left,
    right: data.right,
    matches
  };
}
