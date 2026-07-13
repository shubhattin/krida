import type { CrossordPuzzle, CrossordPuzzleGridCell, CrossWordPuzzleWord } from '~/db/schema_zod';
import {
  type CrossWordCell,
  type CrossWordDirection,
  type CrossWordEntry,
  type CrossWordGamePuzzle
} from './game_model';

export function dbDirectionToGame(direction: CrossWordPuzzleWord['direction']): CrossWordDirection {
  return direction === 'horizontal' ? 'across' : 'down';
}

export function gameDirectionToDb(direction: CrossWordDirection): CrossWordPuzzleWord['direction'] {
  return direction === 'across' ? 'horizontal' : 'vertical';
}

export function entryIdFromWord(word: Pick<CrossWordPuzzleWord, 'location' | 'direction'>) {
  return `${word.location[0]}:${word.location[1]}:${word.direction}`;
}

/**
 * Map DB grid cell to legacy game cell:
 * - box → null (blocked)
 * - alpha with is_visible + letter → fixed letter
 * - alpha otherwise → '' (editable; answer comes from word_list)
 */
export function gridCellToGameCell(cell: CrossordPuzzleGridCell): CrossWordCell {
  if (cell.type === 'box') return null;
  if (cell.is_visible && cell.text) return cell.text.toUpperCase();
  return '';
}

export function wordToEntry(word: CrossWordPuzzleWord): CrossWordEntry {
  return {
    id: entryIdFromWord(word),
    answer: word.word.toUpperCase(),
    clue: word.description?.trim() || word.word,
    row: word.location[0],
    col: word.location[1],
    direction: dbDirectionToGame(word.direction)
  };
}

export function toCrossWordGamePuzzle(puzzle: CrossordPuzzle): CrossWordGamePuzzle {
  return {
    id: puzzle.id,
    title: puzzle.title,
    description: puzzle.description ?? '',
    dimensions: puzzle.grid_dimensions,
    grid: puzzle.grid_data.map((row) => row.map(gridCellToGameCell)),
    entries: puzzle.word_list.map(wordToEntry)
  };
}
