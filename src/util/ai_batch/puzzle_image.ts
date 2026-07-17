import type { PuzzleImageGame } from '~/util/types/ai_batch_metadata';

/** Legacy padavali custom_id prefix (kept for existing batch rows). */
export const PADAVALI_PUZZLE_IMAGE_CUSTOM_ID_PREFIX = 'puzzle-image';
export const CROSSWORD_PUZZLE_IMAGE_CUSTOM_ID_PREFIX = 'crossword-puzzle-image';

export const getPuzzleImageBatchCustomId = (
  puzzle_id: number,
  game: PuzzleImageGame = 'padavali'
) => {
  if (game === 'crossword') {
    return `${CROSSWORD_PUZZLE_IMAGE_CUSTOM_ID_PREFIX}-${puzzle_id}`;
  }
  // Padavali keeps the historical `puzzle-image-{id}` form for back-compat.
  return `${PADAVALI_PUZZLE_IMAGE_CUSTOM_ID_PREFIX}-${puzzle_id}`;
};

export const parsePuzzleIdFromBatchCustomId = (
  custom_id: string
): { puzzle_id: number; game: PuzzleImageGame } | null => {
  const crosswordMatch = /^crossword-puzzle-image-(\d+)$/.exec(custom_id);
  if (crosswordMatch) {
    return {
      puzzle_id: Number.parseInt(crosswordMatch[1]!, 10),
      game: 'crossword'
    };
  }
  const padavaliMatch = /^puzzle-image-(\d+)$/.exec(custom_id);
  if (padavaliMatch) {
    return {
      puzzle_id: Number.parseInt(padavaliMatch[1]!, 10),
      game: 'padavali'
    };
  }
  return null;
};

/** @deprecated Use parsePuzzleIdFromBatchCustomId which also returns game. */
export const parsePuzzleIdOnlyFromBatchCustomId = (custom_id: string): number | null => {
  return parsePuzzleIdFromBatchCustomId(custom_id)?.puzzle_id ?? null;
};
