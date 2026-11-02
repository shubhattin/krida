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

export type ContextCollectionMember = {
  id: number;
  kind: GameKind;
  slug: string;
  title: string;
  description: string;
  listed: boolean;
};

export type ContextCollection = {
  id: number;
  uid: string;
  slug: string;
  title: string;
  description: string;
  listed: boolean;
  members: ContextCollectionMember[];
  /** More members exist than are listed (roster is capped for prompt size). */
  truncated: boolean;
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

/** One puzzle the admin mentioned with `@`, placed just above their message. */
export function renderReferencedPuzzle(puzzle: ContextPuzzle): string {
  return [
    `<referenced_puzzle game="${puzzle.content.kind}" id="${puzzle.id}" mention="@${puzzle.slug}">`,
    puzzleBlock(puzzle),
    '</referenced_puzzle>'
  ].join('\n');
}

/**
 * One collection the admin mentioned with `@collection/<slug>`: metadata plus the member
 * roster (id, game, slug, title, one-line description) — never the members' full contents.
 * The model fetches details of individual puzzles with `sql_query` as needed.
 */
export function renderReferencedCollection(collection: ContextCollection): string {
  const lines = [
    `<referenced_collection id="${collection.id}" slug="${collection.slug}" mention="@collection/${collection.slug}">`,
    `#${collection.id} [${collection.listed ? 'listed' : 'draft'}] slug=${collection.slug} uid=${collection.uid}`,
    `  title: ${oneLine(collection.title)}`
  ];
  if (collection.description.trim())
    lines.push(`  description: ${oneLine(collection.description)}`);
  const memberLines = collection.members.map(
    (member) =>
      `  #${member.id} [${member.kind}]${member.listed ? '' : ' [draft]'} @${member.slug} — ${oneLine(member.title)}${member.description.trim() ? ` — ${oneLine(member.description)}` : ''}`
  );
  lines.push(
    `  puzzles (${collection.members.length}${collection.truncated ? '+' : ''}):`,
    ...(memberLines.length > 0 ? memberLines : ['    (none yet)'])
  );
  if (collection.truncated) {
    lines.push(
      '  … roster truncated; query the database (collection_items + puzzles) for the rest.'
    );
  }
  lines.push('</referenced_collection>');
  return lines.join('\n');
}
