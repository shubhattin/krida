import type { CrossordPuzzleGridCell, CrossWordPuzzleWord } from '~/db/schema_zod';
import { cellHasLetter, getCellLetter } from './grid';

export type WordPlacement = {
  location: [number, number];
  direction: CrossWordPuzzleWord['direction'];
  cells: [number, number][];
};

export type WordPlacementStatus =
  | { status: 'empty' }
  | { status: 'ok'; placement: WordPlacement; hasVisibleLetter: boolean }
  | { status: 'missing'; word: string }
  | { status: 'ambiguous'; word: string; placements: WordPlacement[] }
  | { status: 'duplicate'; word: string; indices: number[] };

export type PlacementAnalysis = {
  statuses: WordPlacementStatus[];
  /** Words with resolved unique placement */
  resolvedWordList: CrossWordPuzzleWord[];
  occupiedCells: Set<string>;
  hasAllValid: boolean;
  canList: boolean;
  /** Found words that have no prefilled/visible letter */
  noVisibleHintWords: { wordIndex: number; word: string }[];
};

function cellKey(r: number, c: number) {
  return `${r},${c}`;
}

/**
 * Collect contiguous letter runs (length >= 2) in both directions.
 * Blank (box) cells break a run — only filled letters count.
 */
export function findAllRuns(grid: CrossordPuzzleGridCell[][]): WordPlacement[] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const runs: WordPlacement[] = [];

  // Horizontal
  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < cols) {
      while (c < cols && !cellHasLetter(grid[r]![c]!)) c++;
      const start = c;
      const cells: [number, number][] = [];
      while (c < cols && cellHasLetter(grid[r]![c]!)) {
        cells.push([r, c]);
        c++;
      }
      if (cells.length >= 2) {
        runs.push({ location: [r, start], direction: 'horizontal', cells });
      }
    }
  }

  // Vertical
  for (let c = 0; c < cols; c++) {
    let r = 0;
    while (r < rows) {
      while (r < rows && !cellHasLetter(grid[r]![c]!)) r++;
      const start = r;
      const cells: [number, number][] = [];
      while (r < rows && cellHasLetter(grid[r]![c]!)) {
        cells.push([r, c]);
        r++;
      }
      if (cells.length >= 2) {
        runs.push({ location: [start, c], direction: 'vertical', cells });
      }
    }
  }

  return runs;
}

function runSpellsWord(
  grid: CrossordPuzzleGridCell[][],
  run: WordPlacement,
  word: string
): boolean {
  if (run.cells.length !== word.length) return false;
  const upper = word.toUpperCase();
  for (let i = 0; i < run.cells.length; i++) {
    const [r, c] = run.cells[i]!;
    const letter = getCellLetter(grid[r]![c]!);
    if (!letter || letter !== upper[i]) return false;
  }
  return true;
}

export function findPlacementsForWord(
  grid: CrossordPuzzleGridCell[][],
  word: string,
  runs?: WordPlacement[]
): WordPlacement[] {
  const trimmed = word.trim();
  if (!trimmed) return [];
  const allRuns = runs ?? findAllRuns(grid);
  return allRuns.filter((run) => runSpellsWord(grid, run, trimmed));
}

function placementHasVisibleLetter(
  grid: CrossordPuzzleGridCell[][],
  placement: WordPlacement
): boolean {
  return placement.cells.some(([r, c]) => {
    const cell = grid[r]?.[c];
    return cell?.is_visible === true && cell.text.length > 0;
  });
}

/**
 * Analyze word_list against grid. Only words with exactly one matching
 * horizontal/vertical path get a resolved location/direction.
 */
export function analyzeWordPlacements(
  grid: CrossordPuzzleGridCell[][],
  wordList: Pick<CrossWordPuzzleWord, 'word' | 'description'>[]
): PlacementAnalysis {
  const runs = findAllRuns(grid);
  const statuses: WordPlacementStatus[] = [];
  const resolvedWordList: CrossWordPuzzleWord[] = [];
  const occupiedCells = new Set<string>();
  const noVisibleHintWords: { wordIndex: number; word: string }[] = [];

  // Duplicate detection across word list (case-insensitive)
  const wordCountMap = new Map<string, number[]>();
  wordList.forEach((item, index) => {
    const key = item.word.trim().toUpperCase();
    if (!key) return;
    if (!wordCountMap.has(key)) wordCountMap.set(key, []);
    wordCountMap.get(key)!.push(index);
  });

  const duplicateIndices = new Set<number>();
  for (const indices of wordCountMap.values()) {
    if (indices.length > 1) {
      for (const i of indices) duplicateIndices.add(i);
    }
  }

  for (let i = 0; i < wordList.length; i++) {
    const item = wordList[i]!;
    const word = item.word.trim();
    if (!word) {
      statuses.push({ status: 'empty' });
      continue;
    }

    if (duplicateIndices.has(i)) {
      const indices = wordCountMap.get(word.toUpperCase()) ?? [i];
      statuses.push({ status: 'duplicate', word, indices });
      continue;
    }

    const placements = findPlacementsForWord(grid, word, runs);
    if (placements.length === 0) {
      statuses.push({ status: 'missing', word });
    } else if (placements.length > 1) {
      statuses.push({ status: 'ambiguous', word, placements });
    } else {
      const placement = placements[0]!;
      const hasVisibleLetter = placementHasVisibleLetter(grid, placement);
      statuses.push({ status: 'ok', placement, hasVisibleLetter });
      if (!hasVisibleLetter) {
        noVisibleHintWords.push({ wordIndex: i, word: word.toUpperCase() });
      }
      resolvedWordList.push({
        word: word.toUpperCase(),
        location: placement.location,
        direction: placement.direction,
        description: item.description ?? null
      });
      for (const [r, c] of placement.cells) {
        occupiedCells.add(cellKey(r, c));
      }
    }
  }

  const nonEmpty = statuses.filter((s) => s.status !== 'empty');
  const hasAllValid =
    nonEmpty.length > 0 && nonEmpty.every((s) => s.status === 'ok') && duplicateIndices.size === 0;
  const canList = hasAllValid;

  return {
    statuses,
    resolvedWordList,
    occupiedCells,
    hasAllValid,
    canList,
    noVisibleHintWords
  };
}

/** Resolve word_list placements for persistence; keeps unresolved words with placeholder location. */
export function resolveWordListForSave(
  grid: CrossordPuzzleGridCell[][],
  wordList: Pick<CrossWordPuzzleWord, 'word' | 'description' | 'location' | 'direction'>[]
): CrossWordPuzzleWord[] {
  const analysis = analyzeWordPlacements(grid, wordList);
  return wordList.map((item, i) => {
    const status = analysis.statuses[i];
    if (status?.status === 'ok') {
      return {
        word: item.word.trim().toUpperCase(),
        location: status.placement.location,
        direction: status.placement.direction,
        description: item.description?.trim() ? item.description.trim() : null
      };
    }
    return {
      word: item.word.trim().toUpperCase(),
      location: item.location ?? [0, 0],
      direction: item.direction ?? 'horizontal',
      description: item.description?.trim() ? item.description.trim() : null
    };
  });
}
