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
    <main className="relative min-h-dvh overflow-hidden">
      {/* Decorative background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full opacity-[0.07]"
        style={{
          background:
            'radial-gradient(ellipse at center, hsl(var(--primary)), transparent 70%)'
        }}
      />
      <CrossWordGameRoot puzzle={examplePuzzle} />
    </main>
  );
}
