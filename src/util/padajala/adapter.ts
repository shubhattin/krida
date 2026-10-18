import type { CrossordPuzzle, CrossordPuzzleGridCell, PadajalaPuzzleWord } from '~/db/schema_zod';
import {
  type PadajalaCell,
  type PadajalaDirection,
  type PadajalaEntry,
  type PadajalaGamePuzzle
} from './game_model';
import { cellHasLetter } from './grid';
import { padajalaActiveWords } from '~/util/puzzle/word_list';

export function dbDirectionToGame(direction: PadajalaPuzzleWord['direction']): PadajalaDirection {
  return direction === 'horizontal' ? 'across' : 'down';
}

export function gameDirectionToDb(direction: PadajalaDirection): PadajalaPuzzleWord['direction'] {
  return direction === 'across' ? 'horizontal' : 'vertical';
}

export function entryIdFromWord(word: Pick<PadajalaPuzzleWord, 'location' | 'direction'>) {
  return `${word.location[0]}:${word.location[1]}:${word.direction}`;
}

/**
 * Map DB grid cell to game cell:
 * - blank text → null (blocked box)
 * - letter + is_visible → fixed/prefilled letter
 * - letter + !is_visible → '' (player fills; answer from word_list)
 */
export function gridCellToGameCell(cell: CrossordPuzzleGridCell): PadajalaCell {
  if (!cellHasLetter(cell)) return null;
  if (cell.is_visible) return cell.text.toUpperCase();
  return '';
}

export function wordToEntry(word: PadajalaPuzzleWord): PadajalaEntry {
  return {
    id: entryIdFromWord(word),
    answer: word.word.toUpperCase(),
    word_dev: word.word_dev.trim(),
    clue: word.description.trim(),
    row: word.location[0],
    col: word.location[1],
    direction: dbDirectionToGame(word.direction)
  };
}

export function toPadajalaGamePuzzle(puzzle: CrossordPuzzle): PadajalaGamePuzzle {
  return {
    id: puzzle.id,
    title: puzzle.title,
    description: puzzle.description,
    dimensions: puzzle.grid_dimensions,
    grid: puzzle.grid_data.map((row) => row.map(gridCellToGameCell)),
    entries: padajalaActiveWords(puzzle.word_list).map(wordToEntry)
  };
}
