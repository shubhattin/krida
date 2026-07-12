import type { z } from 'zod';
import type { crossWordPuzzleSchema } from './cross_word_schema';

/**
 * 6×6 prototype puzzle — Names of Shiva.
 * Answers are Latin transliterations of Sanskrit epithets.
 *
 * Layout (■ = blocked):
 *   S H I V A ■
 *   ■ A ■ ■ ■ ■
 *   ■ R U D R A
 *   ■ A ■ E ■ ■
 *   ■ ■ ■ V ■ ■
 *   U G R A ■ ■
 */
export const NAMES_OF_SHIVA_PUZZLE = {
  id: 'names-of-shiva',
  title: 'Names of Shiva',
  description:
    'Different names of Shiva — fill this Sanskrit crossword using Latin letters. Each clue points to a classic epithet of Mahadeva drawn from Hindu tradition: the auspicious one, the remover, the fierce storm form, the radiant deity, and the formidable presence. Answers are English transliterations, not Devanagari script.',
  dimensions: [6, 6] as [number, number],
  grid: [
    ['S', '', '', '', '', null],
    [null, '', null, null, null, null],
    [null, 'R', '', 'D', '', ''],
    [null, '', null, '', null, null],
    [null, null, null, '', null, null],
    ['U', '', '', '', null, null]
  ] as (string | null)[][],
  entries: [
    {
      id: 'shiva',
      answer: 'SHIVA',
      clue: 'The auspicious one — primary name of the great yogi and destroyer of ignorance',
      row: 0,
      col: 0,
      direction: 'across' as const
    },
    {
      id: 'hara',
      answer: 'HARA',
      clue: '“The remover” — epithet for the one who takes away sorrow and sin',
      row: 0,
      col: 1,
      direction: 'down' as const
    },
    {
      id: 'rudra',
      answer: 'RUDRA',
      clue: 'The howling storm form — fierce Vedic aspect associated with wind and wildness',
      row: 2,
      col: 1,
      direction: 'across' as const
    },
    {
      id: 'deva',
      answer: 'DEVA',
      clue: '“Shining one” / god — a divine title often joined to Shiva in mantras',
      row: 2,
      col: 3,
      direction: 'down' as const
    },
    {
      id: 'ugra',
      answer: 'UGRA',
      clue: 'The formidable / fierce — an intense aspect of Shiva’s power',
      row: 5,
      col: 0,
      direction: 'across' as const
    }
  ]
} satisfies z.input<typeof crossWordPuzzleSchema>;
