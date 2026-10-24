import { normalizeTagSlug, type GameKind } from '~/util/catalog/tags';
import type { GameAnalysis } from '~/util/games/issues';
import { isSimpleGameKind } from '~/util/games/kinds';
import { analyzeAnveshiPuzzle } from '~/util/anveshi/validate';
import { analyzeBhramitaPuzzle } from '~/util/bhramita/validate';
import { analyzeDvayiPuzzle } from '~/util/dvayi/validate';
import { analyzeSurupaPuzzle } from '~/util/surupa/validate';
import { splitDevanagariAksharas } from '~/util/puzzle/devanagari_syllables';
import {
  isValidPadajalaSlug,
  isValidSimpleGameSlug,
  isValidSlug,
  normalizeSlug
} from '~/util/puzzle/slug';
import type { KindedPuzzleDraft, PuzzleDraftByKind } from './schemas';
import {
  draftToGameData,
  normalizePadajalaAnswer,
  PADAJALA_DRAFT_DIMENSIONS
} from './to_game_data';

export type DraftCheck = {
  errors: string[];
  warnings: string[];
  /** Normalized, de-duplicated tag slugs. */
  tags: string[];
  slug: string;
};

const DEVANAGARI = /[ऀ-ॿ]/;

const SLUG_VALIDATORS = {
  padavali: isValidSlug,
  padajala: isValidPadajalaSlug
} satisfies Partial<Record<GameKind, (slug: string) => boolean>>;

export function isValidSlugForKind(kind: GameKind, slug: string) {
  if (isSimpleGameKind(kind)) return isValidSimpleGameSlug(slug);
  return SLUG_VALIDATORS[kind](slug);
}

/**
 * Everything that can be checked without the database. The server adds slug collisions and
 * collection existence on top (`server/draft_checks.ts`).
 */
export function checkDraft(input: KindedPuzzleDraft, slugOverride?: string): DraftCheck {
  const { kind, draft } = input;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (draft.title.trim().length === 0) errors.push('Title is empty.');

  const rawSlug = slugOverride ?? draft.slug;
  const slug = normalizeSlug(rawSlug);
  if (!isValidSlugForKind(kind, slug)) {
    errors.push(
      `Slug “${rawSlug}” is invalid: use lowercase a-z, 0-9 and hyphens, and avoid reserved words.`
    );
  }

  const tags = [...new Set(draft.tags.map(normalizeTagSlug).filter((tag) => tag.length > 0))];
  if (tags.length < draft.tags.length) {
    warnings.push('Some tags were blank or duplicates after normalizing and were dropped.');
  }

  const game = checkGameContent(input);
  errors.push(...game.errors);
  warnings.push(...game.warnings);

  return { errors, warnings, tags, slug };
}

function fromAnalysis(analysis: GameAnalysis) {
  return {
    errors: analysis.errors.map((issue) => issue.message),
    warnings: analysis.warnings.map((issue) => issue.message)
  };
}

function checkGameContent(input: KindedPuzzleDraft): { errors: string[]; warnings: string[] } {
  switch (input.kind) {
    case 'padavali':
      return checkPadavali(input.draft);
    case 'padajala':
      return checkPadajala(input.draft);
    case 'dvayi':
      return fromAnalysis(analyzeDvayiPuzzle(draftToGameData.dvayi(input.draft)));
    case 'bhramita':
      return checkBhramita(input.draft);
    case 'surupa':
      return checkSurupa(input.draft);
    case 'anveshi':
      return checkAnveshi(input.draft);
  }
}

function duplicates(values: string[]) {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
}

function checkPadavali(draft: PuzzleDraftByKind['padavali']) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const words = draft.words.map((word) => word.trim());
  if (words.length === 0) errors.push('Add at least one word.');
  for (const [index, word] of words.entries()) {
    if (!DEVANAGARI.test(word) || splitDevanagariAksharas(word).length === 0) {
      errors.push(`Word ${index + 1} (“${word}”) is not a Devanagari word.`);
    }
  }
  for (const word of duplicates(words)) errors.push(`“${word}” appears more than once.`);

  const cells = draft.grid_rows * draft.grid_cols;
  const aksharas = words.reduce((sum, word) => sum + splitDevanagariAksharas(word).length, 0);
  const grid = `${draft.grid_rows}×${draft.grid_cols}`;
  if (aksharas > cells) {
    errors.push(
      `The words have ${aksharas} akṣaras but a ${grid} grid has only ${cells} cells: use fewer or shorter words, or a bigger grid.`
    );
  } else if (aksharas > cells * 0.85) {
    warnings.push(
      `${aksharas} akṣaras on a ${grid} grid (${cells} cells) is a tight fit; the layout generator may not place every word.`
    );
  }
  return { errors, warnings };
}

function checkPadajala(draft: PuzzleDraftByKind['padajala']) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const maxLength = Math.max(...PADAJALA_DRAFT_DIMENSIONS);
  if (draft.words.length === 0) errors.push('Add at least one entry.');
  const answers = draft.words.map((entry) => normalizePadajalaAnswer(entry.answer));
  for (const [index, entry] of draft.words.entries()) {
    const answer = answers[index] ?? '';
    const label = `Entry ${index + 1} (“${entry.answer}”)`;
    if (!/^[A-Z]{2,}$/.test(answer)) {
      errors.push(`${label}: answer must be 2+ Latin capitals A–Z with no spaces or marks.`);
    } else if (answer.length > maxLength) {
      warnings.push(
        `${label} is longer than the default ${maxLength}×${maxLength} grid; resize the grid in the editor.`
      );
    }
    if (!DEVANAGARI.test(entry.word_dev)) errors.push(`${label}: word_dev must be Devanagari.`);
    if (entry.clue.trim().length === 0) errors.push(`${label}: clue is empty.`);
  }
  for (const answer of duplicates(answers))
    errors.push(`Answer “${answer}” appears more than once.`);
  return { errors, warnings };
}

function checkBhramita(draft: PuzzleDraftByKind['bhramita']) {
  const { errors, warnings } = fromAnalysis(analyzeBhramitaPuzzle(draftToGameData.bhramita(draft)));
  for (const word of duplicates(draft.words.map((word) => word.trim()))) {
    errors.push(`“${word}” appears more than once.`);
  }
  return { errors, warnings };
}

function checkSurupa(draft: PuzzleDraftByKind['surupa']) {
  const errors: string[] = [];
  for (const [index, entry] of draft.words.entries()) {
    const word = entry.word.trim();
    const expected = splitDevanagariAksharas(word);
    const given = entry.aksharas.map((part) => part.akshara.trim());
    if (expected.join('|') !== given.join('|')) {
      errors.push(
        `Word ${index + 1} (“${word}”): akṣaras must be exactly [${expected.join(', ')}] — got [${given.join(', ')}].`
      );
    }
    for (const part of entry.aksharas) {
      if (part.alternatives.some((alt) => alt.trim() === part.akshara.trim())) {
        errors.push(
          `Word ${index + 1}: an alternative for “${part.akshara}” equals the correct akṣara.`
        );
      }
    }
  }
  const analysis = fromAnalysis(analyzeSurupaPuzzle(draftToGameData.surupa(draft)));
  return { errors: [...errors, ...analysis.errors], warnings: analysis.warnings };
}

function checkAnveshi(draft: PuzzleDraftByKind['anveshi']) {
  const errors: string[] = [];
  for (const [index, question] of draft.questions.entries()) {
    const { correct_option_index: correct, options } = question;
    if (correct < 0 || correct >= options.length) {
      errors.push(
        `Question ${index + 1}: correct_option_index ${correct} is out of range (0–${options.length - 1}).`
      );
    }
    for (const option of duplicates(options.map((option) => option.trim()))) {
      errors.push(`Question ${index + 1}: option “${option}” appears more than once.`);
    }
  }
  const analysis = fromAnalysis(analyzeAnveshiPuzzle(draftToGameData.anveshi(draft)));
  return { errors: [...errors, ...analysis.errors], warnings: analysis.warnings };
}
