import type { PuzzleImageGame } from '~/util/types/ai_batch_metadata';
import { isSimpleGameKind, SIMPLE_GAME_KINDS } from '~/util/games/kinds';

/** Legacy padavali custom_id prefix (kept for existing batch rows). */
export const PADAVALI_PUZZLE_IMAGE_CUSTOM_ID_PREFIX = 'puzzle-image';
export const PADAJALA_PUZZLE_IMAGE_CUSTOM_ID_PREFIX = 'padajala-puzzle-image';

export const getPuzzleImageBatchCustomId = (
  puzzle_id: number,
  game: PuzzleImageGame = 'padavali'
) => {
  if (game === 'padajala') {
    return `${PADAJALA_PUZZLE_IMAGE_CUSTOM_ID_PREFIX}-${puzzle_id}`;
  }
  if (isSimpleGameKind(game)) return `${game}-puzzle-image-${puzzle_id}`;
  // Padavali keeps the historical `puzzle-image-{id}` form for back-compat.
  return `${PADAVALI_PUZZLE_IMAGE_CUSTOM_ID_PREFIX}-${puzzle_id}`;
};

export const parsePuzzleIdFromBatchCustomId = (
  custom_id: string
): { puzzle_id: number; game: PuzzleImageGame } | null => {
  const padajalaMatch = /^padajala-puzzle-image-(\d+)$/.exec(custom_id);
  if (padajalaMatch) {
    return {
      puzzle_id: Number.parseInt(padajalaMatch[1]!, 10),
      game: 'padajala'
    };
  }
  const simpleMatch = new RegExp(`^(${SIMPLE_GAME_KINDS.join('|')})-puzzle-image-(\\d+)$`).exec(
    custom_id
  );
  const simpleGame = simpleMatch?.[1];
  if (simpleMatch && simpleGame && isSimpleGameKind(simpleGame)) {
    return { puzzle_id: Number.parseInt(simpleMatch[2]!, 10), game: simpleGame };
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
