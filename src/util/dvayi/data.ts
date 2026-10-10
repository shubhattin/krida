import { z } from 'zod';
import { createGameItemId } from '~/util/games/ids';

export const dvayi_column_item_schema = z.object({
  id: z.string().min(1),
  text: z.string()
});

export const dvayi_match_schema = z.object({
  leftId: z.string().min(1),
  rightId: z.string().min(1)
});

export const dvayi_puzzle_data_schema = z.object({
  left: dvayi_column_item_schema.array(),
  right: dvayi_column_item_schema.array(),
  matches: dvayi_match_schema.array()
});

export type DvayiColumnItem = z.infer<typeof dvayi_column_item_schema>;
export type DvayiMatch = z.infer<typeof dvayi_match_schema>;
export type DvayiPuzzleData = z.infer<typeof dvayi_puzzle_data_schema>;

export const emptyDvayiPuzzleData = (): DvayiPuzzleData => ({
  left: [],
  right: [],
  matches: []
});

export const createDvayiColumnItem = (text = ''): DvayiColumnItem => ({
  id: createGameItemId(),
  text
});
