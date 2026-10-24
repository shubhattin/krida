import type { PadajalaPuzzleWord } from '~/db/schema_zod';
import type { AnveshiPuzzleData } from '~/util/anveshi/data';
import type { BhramitaPuzzleData } from '~/util/bhramita/data';
import type { GameKind } from '~/util/catalog/tags';
import type { DvayiPuzzleData } from '~/util/dvayi/data';
import type { PadavaliWordCandidate } from '~/util/puzzle/word_list';
import type { SurupaPuzzleData } from '~/util/surupa/data';

/**
 * Puzzle Creator context as compact XML sections: about half the tokens of JSON, and the
 * section tags give the model clear anchors ("see <collections>"). One renderer per game.
 */

export type ContextPuzzleContent =
  | { kind: 'padavali'; word_list: PadavaliWordCandidate[]; grid_dimensions: [number, number] }
  | { kind: 'padajala'; word_list: PadajalaPuzzleWord[] }
  | { kind: 'dvayi'; data: DvayiPuzzleData }
  | { kind: 'bhramita'; data: BhramitaPuzzleData }
  | { kind: 'surupa'; data: SurupaPuzzleData }
  | { kind: 'anveshi'; data: AnveshiPuzzleData };

export type ContextPuzzle = {
  id: number;
  slug: string;
  title: string;
  description: string;
  listed: boolean;
  tags: string[];
  collection_ids: number[];
  content: ContextPuzzleContent;
};

export type ContextInput = {
  game_kind: GameKind;
  puzzles: ContextPuzzle[];
  /** Every tag, with how many puzzles (any game) use it. */
  tags: { slug: string; usage: number }[];
  collections: { id: number; slug: string; title: string; listed: boolean }[];
};

/** Strip newlines so one field stays on one line. */
const oneLine = (text: string) => text.replace(/\s*\n\s*/g, ' ').trim();

const listOrNone = (items: string[], separator = ', ') =>
  items.length > 0 ? items.join(separator) : '(none)';

function contentLines(content: ContextPuzzleContent): string[] {
  switch (content.kind) {
    case 'padavali':
      return [
        `  grid: ${content.grid_dimensions[0]}×${content.grid_dimensions[1]}`,
        `  words: ${listOrNone(
          content.word_list.filter((entry) => entry.added !== false).map((entry) => entry.word)
        )}`
      ];
    case 'padajala':
      return [
        '  entries:',
        ...content.word_list
          .filter((entry) => entry.added !== false)
          .map((entry) => `    ${entry.word} (${entry.word_dev}) — ${oneLine(entry.description)}`)
      ];
    case 'dvayi': {
      const right = new Map(content.data.right.map((item) => [item.id, item.text]));
      const left = new Map(content.data.left.map((item) => [item.id, item.text]));
      return [
        `  pairs: ${listOrNone(
          content.data.matches.map(
            (match) => `${left.get(match.leftId) ?? '?'} ↔ ${right.get(match.rightId) ?? '?'}`
          ),
          '; '
        )}`
      ];
    }
    case 'bhramita':
      return [`  words: ${listOrNone(content.data.words.map((entry) => entry.word))}`];
    case 'surupa':
      return [
        '  words:',
        ...content.data.words.map(
          (entry) =>
            `    ${entry.word} [${entry.syllables
              .map((syllable, index) => {
                const alternatives = entry.alternatives[index] ?? [];
                return alternatives.length > 0
                  ? `${syllable}: ${alternatives.join('/')}`
                  : syllable;
              })
              .join(' · ')}]`
        )
      ];
    case 'anveshi':
      return [
        '  questions:',
        ...content.data.questions.flatMap((question) => {
          const options = question.options
            .map((option) =>
              option.id === question.correctOptionId ? `${option.text} ✓` : option.text
            )
            .join(' / ');
          const lines = [`    Q: ${oneLine(question.prompt)}`, `       options: ${options}`];
          if (question.hint.trim()) lines.push(`       hint: ${oneLine(question.hint)}`);
          if (question.explanation.trim()) {
            lines.push(`       explanation: ${oneLine(question.explanation)}`);
          }
          return lines;
        })
      ];
  }
}

function puzzleBlock(puzzle: ContextPuzzle): string {
  const lines = [
    `#${puzzle.id} [${puzzle.listed ? 'listed' : 'draft'}] slug=${puzzle.slug}`,
    `  title: ${oneLine(puzzle.title)}`
  ];
  if (puzzle.description.trim()) lines.push(`  description: ${oneLine(puzzle.description)}`);
  if (puzzle.tags.length > 0) lines.push(`  tags: ${puzzle.tags.join(', ')}`);
  if (puzzle.collection_ids.length > 0) {
    lines.push(`  collections: ${puzzle.collection_ids.map((id) => `#${id}`).join(', ')}`);
  }
  lines.push(...contentLines(puzzle.content));
  return lines.join('\n');
}

export function renderPuzzleContext(input: ContextInput): string {
  const collections = input.collections.map(
    (collection) =>
      `#${collection.id} ${collection.slug} “${oneLine(collection.title)}”${collection.listed ? '' : ' [unlisted]'}`
  );
  const tags = input.tags.map((tag) => `${tag.slug} (${tag.usage})`).join(', ');

  return [
    `<collections count="${input.collections.length}">`,
    ...(collections.length > 0 ? collections : ['(none)']),
    '</collections>',
    '',
    `<tags count="${input.tags.length}" note="slug (puzzles using it, all games)">`,
    tags || '(none)',
    '</tags>',
    '',
    `<puzzles game="${input.game_kind}" count="${input.puzzles.length}">`,
    input.puzzles.map(puzzleBlock).join('\n\n') || '(none yet)',
    '</puzzles>'
  ].join('\n');
}
