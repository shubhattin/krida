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

export function findPlacementsForWord(
  grid: CrossordPuzzleGridCell[][],
  word: string
): WordPlacement[] {
  const trimmed = word.trim();
  if (!trimmed) return [];
  const upper = trimmed.toUpperCase();
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const placements: WordPlacement[] = [];

  const addPlacementIfMatched = (
    row: number,
    col: number,
    direction: CrossWordPuzzleWord['direction']
  ) => {
    const endRow = direction === 'vertical' ? row + upper.length : row;
    const endCol = direction === 'horizontal' ? col + upper.length : col;
    if (endRow > rows || endCol > cols) return;

    const cells: [number, number][] = [];
    for (let i = 0; i < upper.length; i++) {
      const r = direction === 'vertical' ? row + i : row;
      const c = direction === 'horizontal' ? col + i : col;
      if (getCellLetter(grid[r]![c]!) !== upper[i]) return;
      cells.push([r, c]);
    }
    placements.push({ location: [row, col], direction, cells });
  };

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      addPlacementIfMatched(row, col, 'horizontal');
      addPlacementIfMatched(row, col, 'vertical');
    }
  }

  return placements;
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

function isContainedWithin(placement: WordPlacement, containingPlacement: WordPlacement): boolean {
  const containingCells = new Set(containingPlacement.cells.map(([row, col]) => cellKey(row, col)));
  return placement.cells.every(([row, col]) => containingCells.has(cellKey(row, col)));
}

function normalizeWordDev(word_dev: string | null | undefined): string {
  return (word_dev ?? '').trim();
}

/**
 * Analyze word_list against grid. Only words with exactly one matching
 * horizontal/vertical path get a resolved location/direction.
 * Entries with `added === false` are skipped (treated as empty for validation).
 */
export function analyzeWordPlacements(
  grid: CrossordPuzzleGridCell[][],
  wordList: (Pick<CrossWordPuzzleWord, 'word' | 'description'> &
    Partial<Pick<CrossWordPuzzleWord, 'added' | 'word_dev'>>)[]
): PlacementAnalysis {
  const statuses: (WordPlacementStatus | undefined)[] = [];
  const occupiedCells = new Set<string>();
  const noVisibleHintWords: { wordIndex: number; word: string }[] = [];
  const resolvedLongerPlacements: WordPlacement[] = [];

  // Duplicate detection across enabled word list (case-insensitive)
  const wordCountMap = new Map<string, number[]>();
  wordList.forEach((item, index) => {
    if (item.added === false) return;
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

  const placementOrder = wordList
    .map((item, index) => ({ index, length: item.word.trim().length, added: item.added !== false }))
    .filter((entry) => entry.added)
    .toSorted((a, b) => b.length - a.length || a.index - b.index);

  // Resolve long words first, then their potential subwords. This permits
  // intentional overlap such as PRANAYAMA and YAMA on the same path.
  for (const { index: i } of placementOrder) {
    const item = wordList[i]!;
    const word = item.word.trim();
    if (!word) {
      statuses[i] = { status: 'empty' };
      continue;
    }

    if (duplicateIndices.has(i)) {
      const indices = wordCountMap.get(word.toUpperCase()) ?? [i];
      statuses[i] = { status: 'duplicate', word, indices };
      continue;
    }

    const placements = findPlacementsForWord(grid, word).filter(
      (placement) =>
        !resolvedLongerPlacements.some((longerPlacement) =>
          isContainedWithin(placement, longerPlacement)
        )
    );
    if (placements.length === 0) {
      statuses[i] = { status: 'missing', word };
    } else if (placements.length > 1) {
      statuses[i] = { status: 'ambiguous', word, placements };
    } else {
      const placement = placements[0]!;
      const hasVisibleLetter = placementHasVisibleLetter(grid, placement);
      statuses[i] = { status: 'ok', placement, hasVisibleLetter };
      resolvedLongerPlacements.push(placement);
    }
  }

  // Mark disabled / unset entries as empty so they do not affect listing checks
  for (let i = 0; i < wordList.length; i++) {
    if (statuses[i] !== undefined) continue;
    statuses[i] = { status: 'empty' };
  }

  const resolvedStatuses = statuses.map((status) => status ?? { status: 'empty' as const });
  const resolvedWordList: CrossWordPuzzleWord[] = [];

  for (let i = 0; i < resolvedStatuses.length; i++) {
    const status = resolvedStatuses[i]!;
    if (status.status !== 'ok') continue;

    const item = wordList[i]!;
    const word = item.word.trim().toUpperCase();
    if (!status.hasVisibleLetter) {
      noVisibleHintWords.push({ wordIndex: i, word });
    }
    resolvedWordList.push({
      word,
      word_dev: normalizeWordDev(item.word_dev),
      location: status.placement.location,
      direction: status.placement.direction,
      description: item.description.trim(),
      added: true
    });
  }

  // Coverage for editor warnings/highlights: include cells from any found placement
  // (unique, ambiguous, or duplicate). Orphan letters are only those never matched.
  for (let i = 0; i < resolvedStatuses.length; i++) {
    const status = resolvedStatuses[i]!;
    if (status.status === 'ok') {
      for (const [r, c] of status.placement.cells) occupiedCells.add(cellKey(r, c));
    } else if (status.status === 'ambiguous') {
      for (const placement of status.placements) {
        for (const [r, c] of placement.cells) occupiedCells.add(cellKey(r, c));
      }
    } else if (status.status === 'duplicate') {
      for (const placement of findPlacementsForWord(grid, status.word)) {
        for (const [r, c] of placement.cells) occupiedCells.add(cellKey(r, c));
      }
    }
  }

  const nonEmpty = resolvedStatuses.filter((s) => s.status !== 'empty');
  const hasAllValid =
    nonEmpty.length > 0 && nonEmpty.every((s) => s.status === 'ok') && duplicateIndices.size === 0;
  const canList = hasAllValid;

  return {
    statuses: resolvedStatuses,
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
  wordList: (Pick<CrossWordPuzzleWord, 'word' | 'description' | 'location' | 'direction'> &
    Partial<Pick<CrossWordPuzzleWord, 'added' | 'word_dev'>>)[]
): CrossWordPuzzleWord[] {
  const analysis = analyzeWordPlacements(grid, wordList);
  return wordList.map((item, i) => {
    const added = item.added ?? true;
    const word_dev = normalizeWordDev(item.word_dev);
    const status = analysis.statuses[i];
    if (status?.status === 'ok') {
      return {
        word: item.word.trim().toUpperCase(),
        word_dev,
        location: status.placement.location,
        direction: status.placement.direction,
        description: item.description.trim(),
        added
      };
    }
    return {
      word: item.word.trim().toUpperCase(),
      word_dev,
      location: item.location ?? [0, 0],
      direction: item.direction ?? 'horizontal',
      description: item.description.trim(),
      added
    };
  });
}
