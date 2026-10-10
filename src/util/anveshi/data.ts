import { z } from 'zod';
import { createGameItemId } from '~/util/games/ids';

export const anveshi_option_schema = z.object({
  id: z.string().min(1),
  text: z.string()
});

export const anveshi_question_schema = z.object({
  id: z.string().min(1),
  prompt: z.string(),
  hint: z.string(),
  explanation: z.string(),
  options: anveshi_option_schema.array(),
  correctOptionId: z.string()
});

export const anveshi_puzzle_data_schema = z.object({
  questions: anveshi_question_schema.array()
});

export type AnveshiOption = z.infer<typeof anveshi_option_schema>;
export type AnveshiQuestion = z.infer<typeof anveshi_question_schema>;
export type AnveshiPuzzleData = z.infer<typeof anveshi_puzzle_data_schema>;

export const createAnveshiOption = (text = ''): AnveshiOption => ({
  id: createGameItemId(),
  text
});

export const createAnveshiQuestion = (): AnveshiQuestion => {
  const options = [createAnveshiOption(), createAnveshiOption()];
  return {
    id: createGameItemId(),
    prompt: '',
    hint: '',
    explanation: '',
    options,
    correctOptionId: options[0]!.id
  };
};

export const emptyAnveshiPuzzleData = (): AnveshiPuzzleData => ({ questions: [] });
