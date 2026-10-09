import { analysisFrom, issue, type GameAnalysis } from '~/util/games/issues';
import type { AnveshiPuzzleData } from './data';
import { inferAnveshiPuzzleData } from './infer';

export function analyzeAnveshiPuzzle(data: AnveshiPuzzleData): GameAnalysis {
  const inferred = inferAnveshiPuzzleData(data);
  const errors = [];
  const warnings = [];

  if (inferred.questions.length === 0) {
    errors.push(issue('error', 'empty', 'Add at least one question.'));
  }

  for (const [index, question] of inferred.questions.entries()) {
    if (question.prompt.trim().length === 0) {
      errors.push(
        issue(
          'error',
          'empty_prompt',
          `Question ${index + 1} needs a prompt.`,
          `questions.${index}.prompt`
        )
      );
    }
    if (question.options.length < 2) {
      errors.push(
        issue(
          'error',
          'too_few_options',
          `Question ${index + 1} needs at least two options.`,
          `questions.${index}.options`
        )
      );
    }
    const seen = new Set<string>();
    for (const [optionIndex, option] of question.options.entries()) {
      if (option.text.trim().length === 0) {
        errors.push(
          issue(
            'error',
            'empty_option',
            `Question ${index + 1}, option ${optionIndex + 1} is empty.`,
            `questions.${index}.options.${optionIndex}`
          )
        );
      }
      const key = option.text.trim();
      if (key && seen.has(key)) {
        warnings.push(
          issue(
            'warning',
            'duplicate_option',
            `Question ${index + 1} has duplicate option text.`
          )
        );
      }
      seen.add(key);
    }
    const optionIds = new Set(question.options.map((option) => option.id));
    if (!optionIds.has(question.correctOptionId)) {
      errors.push(
        issue(
          'error',
          'missing_correct',
          `Question ${index + 1} has no correct option selected.`,
          `questions.${index}.correctOptionId`
        )
      );
    }
    if (question.hint.trim().length === 0) {
      warnings.push(
        issue('warning', 'missing_hint', `Question ${index + 1} has no hint.`)
      );
    }
    if (question.explanation.trim().length === 0) {
      warnings.push(
        issue('warning', 'missing_explanation', `Question ${index + 1} has no explanation.`)
      );
    }
    if (question.options.length < 4) {
      warnings.push(
        issue('warning', 'few_options', `Question ${index + 1} has fewer than four options.`)
      );
    }
  }

  const playable = inferred.questions.filter(
    (question) =>
      question.prompt.trim().length > 0 &&
      question.options.length >= 2 &&
      question.options.every((option) => option.text.trim().length > 0) &&
      question.options.some((option) => option.id === question.correctOptionId)
  ).length;

  return analysisFrom(errors, warnings, playable >= 1);
}
