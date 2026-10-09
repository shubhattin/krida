import { analysisFrom, issue, type GameAnalysis } from '~/util/games/issues';
import type { DvayiPuzzleData } from './data';
import { inferDvayiPuzzleData } from './infer';

export function analyzeDvayiPuzzle(data: DvayiPuzzleData): GameAnalysis {
  const inferred = inferDvayiPuzzleData(data);
  const errors = [];
  const warnings = [];

  if (inferred.left.length === 0 && inferred.right.length === 0) {
    errors.push(issue('error', 'empty', 'Add at least one pair of items to match.'));
  }

  const leftIds = new Set<string>();
  for (const [index, item] of inferred.left.entries()) {
    if (leftIds.has(item.id)) {
      errors.push(issue('error', 'duplicate_id', 'Duplicate left-column id.', `left.${index}`));
    }
    leftIds.add(item.id);
    if (item.text.trim().length === 0) {
      errors.push(
        issue('error', 'empty_left', `Left item ${index + 1} needs text.`, `left.${index}.text`)
      );
    }
  }

  const rightIds = new Set<string>();
  for (const [index, item] of inferred.right.entries()) {
    if (rightIds.has(item.id)) {
      errors.push(issue('error', 'duplicate_id', 'Duplicate right-column id.', `right.${index}`));
    }
    rightIds.add(item.id);
    if (item.text.trim().length === 0) {
      errors.push(
        issue('error', 'empty_right', `Right item ${index + 1} needs text.`, `right.${index}.text`)
      );
    }
  }

  const matchedLeft = new Set(inferred.matches.map((match) => match.leftId));
  const matchedRight = new Set(inferred.matches.map((match) => match.rightId));
  const unmatchedLeft = inferred.left.filter((item) => !matchedLeft.has(item.id));
  const unmatchedRight = inferred.right.filter((item) => !matchedRight.has(item.id));

  if (unmatchedLeft.length > 0) {
    warnings.push(
      issue(
        'warning',
        'unmatched_left',
        `${unmatchedLeft.length} left item${unmatchedLeft.length === 1 ? '' : 's'} still unmatched.`
      )
    );
  }
  if (unmatchedRight.length > 0) {
    warnings.push(
      issue(
        'warning',
        'unmatched_right',
        `${unmatchedRight.length} right item${unmatchedRight.length === 1 ? '' : 's'} still unmatched.`
      )
    );
  }
  if (inferred.left.length !== inferred.right.length) {
    warnings.push(
      issue(
        'warning',
        'uneven_columns',
        `Columns have different lengths (${inferred.left.length} vs ${inferred.right.length}).`
      )
    );
  }

  const completePairs = inferred.matches.length;
  const canList =
    completePairs >= 2 && unmatchedLeft.length === 0 && unmatchedRight.length === 0;

  if (!canList && completePairs < 2) {
    warnings.push(
      issue('warning', 'too_few_pairs', 'Listing needs at least two complete matched pairs.')
    );
  }

  return analysisFrom(errors, warnings, canList);
}
