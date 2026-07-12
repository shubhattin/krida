import type { Metadata } from 'next';
import CrossWordGameRoot from '~/components/pages/cross_word/CrossWordGame/CrossWordGameRoot';
import { crossWordPuzzleSchema } from '~/util/cross_word/cross_word_schema';
import { NAMES_OF_SHIVA_PUZZLE } from '~/util/cross_word/example_shiva_puzzle';

export const metadata: Metadata = {
  title: 'Names of Shiva — Crossword',
  description:
    'A Sanskrit-themed crossword of Shiva’s epithets, played with Latin letters. Prototype crossword puzzle for Padavali.'
};

const examplePuzzle = crossWordPuzzleSchema.parse(NAMES_OF_SHIVA_PUZZLE);

export default function CrossWordPage() {
  return (
    <main className="min-h-dvh">
      <CrossWordGameRoot puzzle={examplePuzzle} />
    </main>
  );
}
