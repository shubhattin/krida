import { analysisFrom, issue, type GameAnalysis } from '~/util/games/issues';
import type { SurupaPuzzleData } from './data';
import { inferSurupaPuzzleData } from './infer';

export function analyzeSurupaPuzzle(data: SurupaPuzzleData): GameAnalysis {
  const inferred = inferSurupaPuzzleData(data);
  const errors = [];
  const warnings = [];

  if (inferred.words.length === 0) {
    errors.push(issue('error', 'empty', 'Add at least one word to correct.'));
  }

  for (const [index, entry] of inferred.words.entries()) {
    const trimmed = entry.word.trim();
    if (trimmed.length === 0) {
      errors.push(issue('error', 'empty_word', `Word ${index + 1} is empty.`, `words.${index}`));
      continue;
    }
    if (entry.syllables.length === 0) {
      errors.push(
        issue(
          'error',
          'no_syllables',
          `Could not extract syllables from “${trimmed}”.`,
          `words.${index}.syllables`
        )
      );
      continue;
    }
    if (entry.alternatives.length !== entry.syllables.length) {
      errors.push(
        issue(
          'error',
          'alternatives_mismatch',
          `“${trimmed}” needs one alternative list per syllable (${entry.syllables.length}).`,
          `words.${index}.alternatives`
        )
      );
    }
    const missingAlts = entry.alternatives.filter((list) => list.length === 0).length;
    if (missingAlts > 0) {
      warnings.push(
        issue(
          'warning',
          'no_distractors',
          `“${trimmed}” has ${missingAlts} syllable${missingAlts === 1 ? '' : 's'} with no alternatives.`
        )
      );
    }
  }

  const playable = inferred.words.filter(
    (entry) => entry.syllables.length > 0 && entry.alternatives.length === entry.syllables.length
  ).length;
  return analysisFrom(errors, warnings, playable >= 1);
}
