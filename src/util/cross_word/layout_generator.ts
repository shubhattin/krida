import type { CrossordPuzzleGridCell, CrossWordPuzzleWord } from '~/db/schema_zod';
import { createEmptyGridData, createLetterCell } from './grid';
import { analyzeWordPlacements } from './placement';

export type LayoutGeneratorWord = {
  id: string;
  word: string;
  description?: string;
};

export type GeneratedLayoutPlacement = {
  id: string;
  location: [number, number];
  direction: CrossWordPuzzleWord['direction'];
};

export type GeneratedLayoutScore = {
  placedWordCount: number;
  placedLetterCount: number;
  intersectionCount: number;
  /** Area of the smallest rectangle containing all playable cells. Lower is better. */
  compactness: number;
  /** Blocked cells inside that rectangle. Lower means fewer visual gaps between words. */
  gapCount: number;
};

export type GeneratedCrosswordLayout = {
  gridData: CrossordPuzzleGridCell[][];
  placements: GeneratedLayoutPlacement[];
  placedIds: string[];
  omittedIds: string[];
  score: GeneratedLayoutScore;
};

export type LayoutRanking = 'intersections' | 'words' | 'letters';

/** Prefer where the crossword blob sits on the fixed grid. */
export type LayoutDensity = 'balanced' | 'center' | 'left' | 'right' | 'top' | 'bottom';

type NormalizedWord = LayoutGeneratorWord & { normalized: string };

type InternalPlacement = GeneratedLayoutPlacement & { word: NormalizedWord };

type GridCell = { letter: string; directions: Set<CrossWordPuzzleWord['direction']> } | null;

const DEFAULT_MAX_CANDIDATES = 12;
const DEFAULT_ATTEMPTS = 48;
const DEFAULT_SEARCH_NODES = 700;

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const otherIndex = Math.floor(random() * (index + 1));
    const item = result[index]!;
    result[index] = result[otherIndex]!;
    result[otherIndex] = item;
  }
  return result;
}

function makeInternalGrid(dimensions: [number, number]): GridCell[][] {
  const [rows, cols] = dimensions;
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
}

function cloneInternalGrid(grid: GridCell[][]): GridCell[][] {
  return grid.map((row) =>
    row.map((cell) => (cell ? { letter: cell.letter, directions: new Set(cell.directions) } : null))
  );
}

function placementCells(placement: InternalPlacement): [number, number][] {
  return [...placement.word.normalized].map((_, index) => [
    placement.location[0] + (placement.direction === 'vertical' ? index : 0),
    placement.location[1] + (placement.direction === 'horizontal' ? index : 0)
  ]);
}

function isInBounds(row: number, col: number, dimensions: [number, number]): boolean {
  return row >= 0 && col >= 0 && row < dimensions[0] && col < dimensions[1];
}

function fitsPlacement(
  grid: GridCell[][],
  placement: InternalPlacement,
  dimensions: [number, number],
  requireIntersection: boolean
): number | null {
  const { normalized } = placement.word;
  const [startRow, startCol] = placement.location;
  const rowStep = placement.direction === 'vertical' ? 1 : 0;
  const colStep = placement.direction === 'horizontal' ? 1 : 0;
  const endRow = startRow + rowStep * (normalized.length - 1);
  const endCol = startCol + colStep * (normalized.length - 1);
  if (!isInBounds(startRow, startCol, dimensions) || !isInBounds(endRow, endCol, dimensions)) {
    return null;
  }

  const beforeRow = startRow - rowStep;
  const beforeCol = startCol - colStep;
  const afterRow = endRow + rowStep;
  const afterCol = endCol + colStep;
  if (isInBounds(beforeRow, beforeCol, dimensions) && grid[beforeRow]![beforeCol]) return null;
  if (isInBounds(afterRow, afterCol, dimensions) && grid[afterRow]![afterCol]) return null;

  let intersections = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    const row = startRow + rowStep * index;
    const col = startCol + colStep * index;
    const existing = grid[row]![col];
    const letter = normalized[index]!;
    if (existing) {
      if (existing.letter !== letter || existing.directions.has(placement.direction)) return null;
      intersections += 1;
      continue;
    }

    const perpendicularCells =
      placement.direction === 'horizontal'
        ? [
            [row - 1, col],
            [row + 1, col]
          ]
        : [
            [row, col - 1],
            [row, col + 1]
          ];
    if (
      perpendicularCells.some(
        ([neighborRow, neighborCol]) =>
          isInBounds(neighborRow, neighborCol, dimensions) && grid[neighborRow]![neighborCol]
      )
    ) {
      return null;
    }
  }

  return requireIntersection && intersections === 0 ? null : intersections;
}

function addPlacement(grid: GridCell[][], placement: InternalPlacement): void {
  for (const [index, [row, col]] of placementCells(placement).entries()) {
    const current = grid[row]![col];
    if (current) {
      current.directions.add(placement.direction);
    } else {
      grid[row]![col] = {
        letter: placement.word.normalized[index]!,
        directions: new Set([placement.direction])
      };
    }
  }
}

function potentialPlacements(
  grid: GridCell[][],
  word: NormalizedWord,
  dimensions: [number, number],
  hasPlacedWord: boolean
): { placement: InternalPlacement; intersections: number }[] {
  const candidates: { placement: InternalPlacement; intersections: number }[] = [];
  const seen = new Set<string>();
  const directions: CrossWordPuzzleWord['direction'][] = ['horizontal', 'vertical'];

  const addCandidate = (
    location: [number, number],
    direction: CrossWordPuzzleWord['direction']
  ) => {
    const key = `${location[0]},${location[1]},${direction}`;
    if (seen.has(key)) return;
    seen.add(key);
    const placement: InternalPlacement = { id: word.id, word, location, direction };
    const intersections = fitsPlacement(grid, placement, dimensions, hasPlacedWord);
    if (intersections !== null) candidates.push({ placement, intersections });
  };

  if (!hasPlacedWord) {
    for (const direction of directions) {
      const rowLimit =
        direction === 'vertical' ? dimensions[0] - word.normalized.length + 1 : dimensions[0];
      const colLimit =
        direction === 'horizontal' ? dimensions[1] - word.normalized.length + 1 : dimensions[1];
      for (let row = 0; row < rowLimit; row += 1) {
        for (let col = 0; col < colLimit; col += 1) addCandidate([row, col], direction);
      }
    }
    return candidates;
  }

  for (let row = 0; row < dimensions[0]; row += 1) {
    for (let col = 0; col < dimensions[1]; col += 1) {
      const cell = grid[row]![col];
      if (!cell) continue;
      for (let letterIndex = 0; letterIndex < word.normalized.length; letterIndex += 1) {
        if (word.normalized[letterIndex] !== cell.letter) continue;
        for (const direction of directions) {
          if (cell.directions.has(direction)) continue;
          addCandidate(
            [
              row - (direction === 'vertical' ? letterIndex : 0),
              col - (direction === 'horizontal' ? letterIndex : 0)
            ],
            direction
          );
        }
      }
    }
  }
  return candidates;
}

function toGridData(
  grid: GridCell[][],
  dimensions: [number, number],
  placements: readonly InternalPlacement[]
): CrossordPuzzleGridCell[][] {
  const result = createEmptyGridData(dimensions);
  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[row]!.length; col += 1) {
      const cell = grid[row]![col];
      if (cell) result[row]![col] = createLetterCell(cell.letter, false);
    }
  }
  // One visible hint letter per placed word (start cell); shared crossings stay visible once.
  for (const placement of placements) {
    const [row, col] = placement.location;
    const cell = result[row]?.[col];
    if (!cell || cell.text.length === 0) continue;
    result[row]![col] = createLetterCell(cell.text, true);
  }
  return result;
}

function gridBounds(grid: GridCell[][]): {
  occupiedCells: number;
  minRow: number;
  minCol: number;
  maxRow: number;
  maxCol: number;
} | null {
  let occupiedCells = 0;
  let minRow = Number.POSITIVE_INFINITY;
  let minCol = Number.POSITIVE_INFINITY;
  let maxRow = -1;
  let maxCol = -1;
  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[row]!.length; col += 1) {
      if (!grid[row]![col]) continue;
      occupiedCells += 1;
      minRow = Math.min(minRow, row);
      minCol = Math.min(minCol, col);
      maxRow = Math.max(maxRow, row);
      maxCol = Math.max(maxCol, col);
    }
  }
  return occupiedCells === 0 ? null : { occupiedCells, minRow, minCol, maxRow, maxCol };
}

function projectedGapCount(
  grid: GridCell[][],
  placement: InternalPlacement,
  intersections: number
): number {
  const currentBounds = gridBounds(grid);
  if (!currentBounds) return 0;
  const cells = placementCells(placement);
  const nextMinRow = Math.min(currentBounds.minRow, cells[0]![0]);
  const nextMinCol = Math.min(currentBounds.minCol, cells[0]![1]);
  const lastCell = cells[cells.length - 1]!;
  const nextMaxRow = Math.max(currentBounds.maxRow, lastCell[0]);
  const nextMaxCol = Math.max(currentBounds.maxCol, lastCell[1]);
  const area = (nextMaxRow - nextMinRow + 1) * (nextMaxCol - nextMinCol + 1);
  return area - (currentBounds.occupiedCells + cells.length - intersections);
}

/**
 * Higher = better match for the requested word-density region.
 * `balanced` returns 0 so other ranking signals decide.
 */
function regionAffinity(
  avgRow: number,
  avgCol: number,
  dimensions: [number, number],
  density: LayoutDensity
): number {
  if (density === 'balanced') return 0;
  const rowSpan = Math.max(dimensions[0] - 1, 1);
  const colSpan = Math.max(dimensions[1] - 1, 1);
  const rowNorm = avgRow / rowSpan;
  const colNorm = avgCol / colSpan;
  switch (density) {
    case 'left':
      return 1 - colNorm;
    case 'right':
      return colNorm;
    case 'top':
      return 1 - rowNorm;
    case 'bottom':
      return rowNorm;
    case 'center': {
      const distance = Math.hypot(rowNorm - 0.5, colNorm - 0.5);
      return 1 - distance / Math.SQRT1_2;
    }
  }
}

function placementRegionAffinity(
  placement: InternalPlacement,
  dimensions: [number, number],
  density: LayoutDensity
): number {
  if (density === 'balanced') return 0;
  const cells = placementCells(placement);
  let sumRow = 0;
  let sumCol = 0;
  for (const [row, col] of cells) {
    sumRow += row;
    sumCol += col;
  }
  return regionAffinity(sumRow / cells.length, sumCol / cells.length, dimensions, density);
}

function layoutRegionAffinity(
  grid: GridCell[][],
  dimensions: [number, number],
  density: LayoutDensity
): number {
  if (density === 'balanced') return 0;
  let sumRow = 0;
  let sumCol = 0;
  let count = 0;
  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[row]!.length; col += 1) {
      if (!grid[row]![col]) continue;
      sumRow += row;
      sumCol += col;
      count += 1;
    }
  }
  if (count === 0) return 0;
  return regionAffinity(sumRow / count, sumCol / count, dimensions, density);
}

/** Every playable cell must be reachable by moving along crossword cells. */
function hasConnectedCells(grid: GridCell[][]): boolean {
  const firstRow = grid.findIndex((row) => row.some((cell) => cell));
  if (firstRow === -1) return false;
  const firstCol = grid[firstRow]!.findIndex((cell) => cell);
  const visited = new Set([`${firstRow},${firstCol}`]);
  const queue: [number, number][] = [[firstRow, firstCol]];
  for (let index = 0; index < queue.length; index += 1) {
    const [row, col] = queue[index]!;
    for (const [nextRow, nextCol] of [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1]
    ]) {
      if (!grid[nextRow]?.[nextCol]) continue;
      const key = `${nextRow},${nextCol}`;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push([nextRow, nextCol]);
    }
  }
  return visited.size === gridBounds(grid)?.occupiedCells;
}

function layoutScore(
  grid: GridCell[][],
  placements: readonly InternalPlacement[]
): GeneratedLayoutScore {
  let intersectionCount = 0;
  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[row]!.length; col += 1) {
      const cell = grid[row]![col];
      if (!cell) continue;
      if (cell.directions.size > 1) intersectionCount += 1;
    }
  }
  const bounds = gridBounds(grid);
  const compactness =
    bounds === null ? 0 : (bounds.maxRow - bounds.minRow + 1) * (bounds.maxCol - bounds.minCol + 1);
  return {
    placedWordCount: placements.length,
    placedLetterCount: placements.reduce(
      (total, placement) => total + placement.word.normalized.length,
      0
    ),
    intersectionCount,
    compactness,
    gapCount: compactness - (bounds?.occupiedCells ?? 0)
  };
}

function toCandidate(
  grid: GridCell[][],
  placements: InternalPlacement[],
  allWords: readonly LayoutGeneratorWord[],
  dimensions: [number, number]
): GeneratedCrosswordLayout | null {
  if (!hasConnectedCells(grid)) return null;
  const gridData = toGridData(grid, dimensions, placements);
  const placedIdSet = new Set(placements.map((placement) => placement.id));
  const placementsForAnalysis = allWords.map((word) => ({
    word: word.word,
    description: word.description ?? '',
    added: placedIdSet.has(word.id)
  }));
  const analysis = analyzeWordPlacements(gridData, placementsForAnalysis);
  if (!analysis.hasAllValid) return null;

  return {
    gridData,
    placements: placements.map(({ id, location, direction }) => ({ id, location, direction })),
    placedIds: placements.map((placement) => placement.id),
    omittedIds: allWords.filter((word) => !placedIdSet.has(word.id)).map((word) => word.id),
    score: layoutScore(grid, placements)
  };
}

function candidateKey(candidate: GeneratedCrosswordLayout): string {
  return candidate.placements
    .toSorted((left, right) => left.id.localeCompare(right.id))
    .map((placement) => `${placement.id}:${placement.location.join(',')}:${placement.direction}`)
    .join('|');
}

/**
 * Produce several clean, connected crossword layouts without changing the grid dimensions.
 * Inputs that are empty, duplicated, or too short for the editor's placement analysis are
 * retained as omitted entries so applying a partial candidate safely excludes them.
 */
export function generateCrosswordLayouts({
  words,
  dimensions,
  maxCandidates = DEFAULT_MAX_CANDIDATES,
  attempts = DEFAULT_ATTEMPTS,
  seed = 1,
  density = 'balanced'
}: {
  words: readonly LayoutGeneratorWord[];
  dimensions: [number, number];
  maxCandidates?: number;
  attempts?: number;
  seed?: number;
  density?: LayoutDensity;
}): GeneratedCrosswordLayout[] {
  const seenWords = new Set<string>();
  const normalizedWords: NormalizedWord[] = [];
  for (const word of words) {
    const normalized = word.word.trim().toUpperCase();
    if (normalized.length < 2 || seenWords.has(normalized)) continue;
    seenWords.add(normalized);
    normalizedWords.push({ ...word, normalized });
  }
  if (normalizedWords.length === 0 || dimensions[0] < 1 || dimensions[1] < 1) return [];

  const candidates: GeneratedCrosswordLayout[] = [];
  const candidateKeys = new Set<string>();
  const random = createRandom(seed);

  for (let attempt = 0; attempt < attempts && candidates.length < maxCandidates; attempt += 1) {
    const orderedWords = shuffled(normalizedWords, random).toSorted(
      (left, right) => right.normalized.length - left.normalized.length
    );
    let searchNodes = 0;
    const best: {
      current: {
        grid: GridCell[][];
        placements: InternalPlacement[];
        score: GeneratedLayoutScore;
      } | null;
    } = {
      current: null
    };

    const isBetterScore = (
      currentScore: GeneratedLayoutScore,
      currentGrid: GridCell[][],
      bestScore: GeneratedLayoutScore,
      bestGrid: GridCell[][]
    ) => {
      if (currentScore.placedWordCount !== bestScore.placedWordCount) {
        return currentScore.placedWordCount > bestScore.placedWordCount;
      }
      if (currentScore.intersectionCount !== bestScore.intersectionCount) {
        return currentScore.intersectionCount > bestScore.intersectionCount;
      }
      if (currentScore.gapCount !== bestScore.gapCount) {
        return currentScore.gapCount < bestScore.gapCount;
      }
      if (currentScore.compactness !== bestScore.compactness) {
        return currentScore.compactness < bestScore.compactness;
      }
      return (
        layoutRegionAffinity(currentGrid, dimensions, density) >
        layoutRegionAffinity(bestGrid, dimensions, density)
      );
    };

    const search = (index: number, grid: GridCell[][], placements: InternalPlacement[]) => {
      if (searchNodes >= DEFAULT_SEARCH_NODES) return;
      searchNodes += 1;
      const currentScore = layoutScore(grid, placements);
      if (
        !best.current ||
        isBetterScore(currentScore, grid, best.current.score, best.current.grid)
      ) {
        best.current = { grid, placements, score: currentScore };
      }
      if (index >= orderedWords.length) return;

      const word = orderedWords[index]!;
      const possible = shuffled(
        potentialPlacements(grid, word, dimensions, placements.length > 0),
        random
      ).map((candidate) => ({
        ...candidate,
        projectedGaps: projectedGapCount(grid, candidate.placement, candidate.intersections),
        regionScore: placementRegionAffinity(candidate.placement, dimensions, density)
      }));
      possible.sort(
        (left, right) =>
          right.intersections - left.intersections ||
          right.regionScore - left.regionScore ||
          left.projectedGaps - right.projectedGaps
      );
      const shortlist = possible.slice(0, 10);

      for (const { placement } of shortlist) {
        const nextGrid = cloneInternalGrid(grid);
        addPlacement(nextGrid, placement);
        search(index + 1, nextGrid, [...placements, placement]);
      }
      // Partial layouts are useful when every active word cannot fit.
      search(index + 1, grid, placements);
    };

    search(0, makeInternalGrid(dimensions), []);
    if (!best.current || best.current.placements.length === 0) continue;
    const candidate = toCandidate(best.current.grid, best.current.placements, words, dimensions);
    if (!candidate) continue;
    const key = candidateKey(candidate);
    if (candidateKeys.has(key)) continue;
    candidateKeys.add(key);
    candidates.push(candidate);
  }

  return rankGeneratedLayouts(candidates, 'intersections');
}

/** Sort existing candidates without generating new ones. */
export function rankGeneratedLayouts(
  candidates: readonly GeneratedCrosswordLayout[],
  ranking: LayoutRanking
): GeneratedCrosswordLayout[] {
  const sorted = [...candidates];
  sorted.sort((left, right) => {
    const scoreDifference =
      ranking === 'intersections'
        ? right.score.intersectionCount - left.score.intersectionCount ||
          right.score.placedWordCount - left.score.placedWordCount ||
          right.score.placedLetterCount - left.score.placedLetterCount
        : ranking === 'words'
          ? right.score.placedWordCount - left.score.placedWordCount ||
            right.score.placedLetterCount - left.score.placedLetterCount ||
            right.score.intersectionCount - left.score.intersectionCount
          : right.score.placedLetterCount - left.score.placedLetterCount ||
            right.score.placedWordCount - left.score.placedWordCount ||
            right.score.intersectionCount - left.score.intersectionCount;
    return (
      scoreDifference ||
      left.score.gapCount - right.score.gapCount ||
      left.score.compactness - right.score.compactness ||
      candidateKey(left).localeCompare(candidateKey(right))
    );
  });
  return sorted;
}
