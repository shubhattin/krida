export const getPuzzleImageBatchCustomId = (puzzle_id: number) => `puzzle-image-${puzzle_id}`;

export const parsePuzzleIdFromBatchCustomId = (custom_id: string): number | null => {
  const match = /^puzzle-image-(\d+)$/.exec(custom_id);
  if (!match) return null;
  return Number.parseInt(match[1], 10);
};
