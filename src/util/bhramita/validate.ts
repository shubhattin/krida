import { analysisFrom, issue, type GameAnalysis } from '~/util/games/issues';
import type { BhramitaPuzzleData } from './data';
import { inferBhramitaPuzzleData } from './infer';

export function analyzeBhramitaPuzzle(data: BhramitaPuzzleData): GameAnalysis {
  const inferred = inferBhramitaPuzzleData(data);
  const errors = [];
  const warnings = [];

  if (inferred.words.length === 0) {
    errors.push(issue('error', 'empty', 'Add at least one word to jumble.'));
  }

  const seen = new Set<string>();
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
    } else if (entry.syllables.length < 2) {
      errors.push(
        issue(
          'error',
          'too_short',
          `“${trimmed}” has only one syllable and cannot be jumbled.`,
          `words.${index}.syllables`
        )
      );
    }
    const key = entry.syllables.join('\u0000');
    if (seen.has(key)) {
      warnings.push(
        issue('warning', 'duplicate_word', `“${trimmed}” is duplicated.`, `words.${index}`)
      );
    }
    seen.add(key);
    if (entry.syllables.length >= 2 && new Set(entry.syllables).size === 1) {
      warnings.push(
        issue(
          'warning',
          'identical_syllables',
          `“${trimmed}” uses the same syllable throughout, so a jumble may look unchanged.`
        )
      );
    }
  }

  const playable = inferred.words.filter((entry) => entry.syllables.length >= 2).length;
  return analysisFrom(errors, warnings, playable >= 1);
}
