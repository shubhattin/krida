import type { AnveshiPuzzleData } from './data';

/** Questions can be long; a handful is enough context for an image prompt. */
const MAX_QUESTIONS = 8;

/** Cover-image prompt context: "question → correct answer" for the first few questions. */
export function anveshiCoverWords(data: AnveshiPuzzleData): string[] {
  return data.questions
    .map((question) => {
      const prompt = question.prompt.trim();
      const answer = question.options
        .find((option) => option.id === question.correctOptionId)
        ?.text.trim();
      if (!prompt) return '';
      return answer ? `${prompt} → ${answer}` : prompt;
    })
    .filter(Boolean)
    .slice(0, MAX_QUESTIONS);
}
