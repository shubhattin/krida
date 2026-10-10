import type { AnveshiPuzzleData } from './data';

/** Drop option-less correct ids; keep author text otherwise. */
export function inferAnveshiPuzzleData(data: AnveshiPuzzleData): AnveshiPuzzleData {
  return {
    questions: data.questions.map((question) => {
      const optionIds = new Set(question.options.map((option) => option.id));
      const correctOptionId = optionIds.has(question.correctOptionId)
        ? question.correctOptionId
        : (question.options[0]?.id ?? '');
      return { ...question, correctOptionId };
    })
  };
}
