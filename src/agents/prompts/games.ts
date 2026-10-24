import type { GameKind } from '~/util/catalog/tags';

/** How each game plays and what a good puzzle for it looks like. Model-facing. */
export const GAME_GUIDES = {
  padavali: {
    name: 'Padāvalī',
    summary: 'word search on a grid of Devanagari akṣaras',
    guide: `Players find hidden Sanskrit words in a grid of Devanagari akṣaras; a word traces a path of neighbouring cells.
- Devanagari words on one theme, each 2–6 akṣaras. Varied lengths make a better grid.
- Set grid_rows and grid_cols; all the words' akṣaras together must fit in the grid with room to spare (aim to fill about 60–80% of the cells).
- Spell carefully (visarga, anusvāra, conjuncts). Follow the forms the existing puzzles use (e.g. nominative with visarga where they do).
- You only write the words and the grid size. The admin lays out the grid in the editor afterwards.`
  },
  padajala: {
    name: 'Padajāla',
    summary: 'crossword with Latin-letter answers and English clues',
    guide: `A crossword. Each entry is a Sanskrit word written in plain Latin capitals in the grid (answer, e.g. VYASA), with its Devanagari form (word_dev) and an English clue.
- Entries on one theme. Answers 3–10 letters, A–Z only (no diacritics or spaces), in the simple romanization the existing puzzles use (SH for श/ष, A for अ/आ, …).
- Clues: short, specific, a little playful; never contain the answer. Match the tone of existing clues.
- Prefer answers that share common letters, so the grid generator can interlock them.
- You only write entries. The admin lays out the grid in the editor afterwards.`
  },
  dvayi: {
    name: 'Dvayī',
    summary: 'match the following',
    guide: `Players pair each left item with its match on the right (the right column is shuffled).
- Pairs with one clear relationship (deity ↔ consort, word ↔ meaning, author ↔ work…). Say what it is in the description.
- Each match must be unambiguous: no right item may plausibly fit two left items.`
  },
  bhramita: {
    name: 'Bhramitā',
    summary: 'jumbled words — unscramble Devanagari akṣaras',
    guide: `Players see a word's akṣaras shuffled and rebuild it.
- Devanagari words on one theme, 3–6 akṣaras each (2-akṣara words are too easy, long compounds too hard).
- Avoid words whose akṣaras spell another valid word when reordered.`
  },
  surupa: {
    name: 'Surūpa',
    summary: 'spelling corrector — pick the right akṣara at each step',
    guide: `Players restore a word akṣara by akṣara, choosing between the correct akṣara and its misspellings.
- Devanagari words on one theme. Split each word into its akṣaras exactly (joined in order they must spell the word; the tool tells you the expected split if you get it wrong).
- For each akṣara give plausible misspellings: confusable consonants (स/श/ष, ब/व, ण/न, ट/त), vowel length (ि/ी, ु/ू), visarga/anusvāra slips. Never include the correct akṣara.`
  },
  anveshi: {
    name: 'Ānveṣī',
    summary: 'multiple-choice quiz',
    guide: `A multiple-choice quiz.
- Questions on one theme, each with exactly one correct answer (correct_option_index is 0-based).
- Wrong options should be plausible, from the same category as the answer.
- hint: an optional nudge (empty string for none). explanation: one or two sentences shown after answering.
- Questions may be in English or Sanskrit; write the options in Devanagari when the chat default says so (it usually does). Match the existing puzzles.`
  }
} as const satisfies Record<GameKind, { name: string; summary: string; guide: string }>;
