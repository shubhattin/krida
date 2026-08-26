import {
  findAllTraversals,
  neighborhoodDirections,
  type Coordinate,
  type GridNeighborhood
} from '~/tools/puzzle/puzzle_tools';
import { splitDevanagariAksharas } from '~/util/puzzle/devanagari_syllables';
import { isWordAdded } from '~/util/puzzle/word_list';
import { createEmptyGridData } from '~/util/puzzle/slug';

/** Neighbor-move mode exposed in the editor. */
export type LayoutNeighborhoodMode = GridNeighborhood | 'all';

/**
 * Word order along each path:
 * - `flexible` — syllables may turn using the chosen neighborhood
 * - `straight` — syllables run only left→right or top→bottom
 */
export type LayoutPathStyle = 'flexible' | 'straight';

export type LayoutRanking = 'words' | 'fill';

/** Left→right and top→bottom only. */
const STRAIGHT_DIRECTIONS: readonly Coordinate[] = [
  [0, 1],
  [1, 0]
];

export type GeneratedLayoutPlacement = {
  slotIndex: number;
  path: Coordinate[];
};

export type GeneratedLayoutScore = {
  placedWordCount: number;
  placedSyllableCount: number;
  emptyCellCount: number;
  compactness: number;
  turnCount: number;
};

export type GeneratedPadavaliLayout = {
  gridData: string[][];
  neighborhood: GridNeighborhood;
  placements: GeneratedLayoutPlacement[];
  placedSlotIndices: number[];
  omittedSlotIndices: number[];
  score: GeneratedLayoutScore;
};

type PreparedWord = {
  slotIndex: number;
  word: string;
  normalized: string;
  syllables: string[];
};

type InternalPlacement = GeneratedLayoutPlacement & {
  word: PreparedWord;
};

const DEFAULT_MAX_CANDIDATES = 12;
const DEFAULT_ATTEMPTS = 48;
const DEFAULT_SEARCH_NODES = 700;
const MAX_PATHS_PER_WORD = 10;
const MAX_PATH_SEARCH_NODES = 90;

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

function cloneGrid(grid: string[][]): string[][] {
  return grid.map((row) => [...row]);
}

function isEmptyCell(grid: string[][], row: number, col: number): boolean {
  return (grid[row]?.[col] ?? '').trim() === '';
}

function inBounds(row: number, col: number, dimensions: [number, number]): boolean {
  return row >= 0 && col >= 0 && row < dimensions[0] && col < dimensions[1];
}

function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

function pathKey(path: readonly Coordinate[]): string {
  return path.map(([row, col]) => cellKey(row, col)).join('>');
}

function pathTurnCount(path: readonly Coordinate[]): number {
  if (path.length < 3) return 0;
  let turns = 0;
  for (let index = 2; index < path.length; index += 1) {
    const previous = path[index - 2]!;
    const current = path[index - 1]!;
    const next = path[index]!;
    const dRow = current[0] - previous[0];
    const dCol = current[1] - previous[1];
    if (next[0] - current[0] !== dRow || next[1] - current[1] !== dCol) {
      turns += 1;
    }
  }
  return turns;
}

function emptyCells(grid: string[][], dimensions: [number, number]): Coordinate[] {
  const cells: Coordinate[] = [];
  for (let row = 0; row < dimensions[0]; row += 1) {
    for (let col = 0; col < dimensions[1]; col += 1) {
      if (isEmptyCell(grid, row, col)) cells.push([row, col]);
    }
  }
  return cells;
}

function occupiedCount(grid: string[][]): number {
  let count = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell.trim() !== '') count += 1;
    }
  }
  return count;
}

function hasOccupiedNeighbor(
  grid: string[][],
  row: number,
  col: number,
  neighborhood: GridNeighborhood,
  dimensions: [number, number]
): boolean {
  for (const [dRow, dCol] of neighborhoodDirections(neighborhood)) {
    const nextRow = row + dRow;
    const nextCol = col + dCol;
    if (!inBounds(nextRow, nextCol, dimensions)) continue;
    if (!isEmptyCell(grid, nextRow, nextCol)) return true;
  }
  return false;
}

function gridBounds(grid: string[][]): {
  minRow: number;
  minCol: number;
  maxRow: number;
  maxCol: number;
} | null {
  let minRow = Number.POSITIVE_INFINITY;
  let minCol = Number.POSITIVE_INFINITY;
  let maxRow = -1;
  let maxCol = -1;
  let found = false;
  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[row]!.length; col += 1) {
      if (grid[row]![col]!.trim() === '') continue;
      found = true;
      minRow = Math.min(minRow, row);
      minCol = Math.min(minCol, col);
      maxRow = Math.max(maxRow, row);
      maxCol = Math.max(maxCol, col);
    }
  }
  return found ? { minRow, minCol, maxRow, maxCol } : null;
}

function collectStraightPaths(
  grid: string[][],
  length: number,
  directions: readonly Coordinate[],
  dimensions: [number, number]
): Coordinate[][] {
  if (length <= 0) return [];
  if (length === 1) {
    return emptyCells(grid, dimensions).map((cell) => [cell]);
  }

  const paths: Coordinate[][] = [];
  const seen = new Set<string>();

  for (let row = 0; row < dimensions[0]; row += 1) {
    for (let col = 0; col < dimensions[1]; col += 1) {
      if (!isEmptyCell(grid, row, col)) continue;
      for (const [dRow, dCol] of directions) {
        const path: Coordinate[] = [[row, col]];
        let fits = true;
        for (let step = 1; step < length; step += 1) {
          const nextRow = row + dRow * step;
          const nextCol = col + dCol * step;
          if (!inBounds(nextRow, nextCol, dimensions) || !isEmptyCell(grid, nextRow, nextCol)) {
            fits = false;
            break;
          }
          path.push([nextRow, nextCol]);
        }
        if (!fits) continue;
        const key = pathKey(path);
        if (seen.has(key)) continue;
        seen.add(key);
        paths.push(path);
      }
    }
  }
  return paths;
}

/** Free-turning paths using the active neighborhood. */
function collectFlexiblePaths(
  grid: string[][],
  length: number,
  neighborhood: GridNeighborhood,
  dimensions: [number, number],
  random: () => number,
  maxPaths: number
): Coordinate[][] {
  if (length <= 0 || maxPaths <= 0) return [];

  const paths: Coordinate[][] = [];
  const seen = new Set<string>();
  const directions = neighborhoodDirections(neighborhood);
  const filled = occupiedCount(grid) > 0;
  let nodes = 0;

  const starts = shuffled(emptyCells(grid, dimensions), random).toSorted((left, right) => {
    if (!filled) return 0;
    const leftTouch = hasOccupiedNeighbor(grid, left[0], left[1], neighborhood, dimensions);
    const rightTouch = hasOccupiedNeighbor(grid, right[0], right[1], neighborhood, dimensions);
    if (leftTouch === rightTouch) return 0;
    return leftTouch ? -1 : 1;
  });

  const visit = (path: Coordinate[], visited: Set<string>) => {
    if (paths.length >= maxPaths || nodes >= MAX_PATH_SEARCH_NODES) return;
    nodes += 1;
    if (path.length === length) {
      const key = pathKey(path);
      if (!seen.has(key)) {
        seen.add(key);
        paths.push(path.map((cell): Coordinate => [cell[0], cell[1]]));
      }
      return;
    }

    const current = path[path.length - 1]!;
    const options: { row: number; col: number; rank: number }[] = [];

    for (const [dRow, dCol] of directions) {
      const nextRow = current[0] + dRow;
      const nextCol = current[1] + dCol;
      if (!inBounds(nextRow, nextCol, dimensions)) continue;
      if (visited.has(cellKey(nextRow, nextCol))) continue;
      if (!isEmptyCell(grid, nextRow, nextCol)) continue;
      const touches = hasOccupiedNeighbor(grid, nextRow, nextCol, neighborhood, dimensions);
      options.push({ row: nextRow, col: nextCol, rank: (touches ? 1 : 0) + random() });
    }

    options.sort((left, right) => right.rank - left.rank);
    for (const option of options) {
      const key = cellKey(option.row, option.col);
      visited.add(key);
      path.push([option.row, option.col]);
      visit(path, visited);
      path.pop();
      visited.delete(key);
      if (paths.length >= maxPaths || nodes >= MAX_PATH_SEARCH_NODES) return;
    }
  };

  for (const start of starts) {
    if (paths.length >= maxPaths) break;
    visit([start], new Set([cellKey(start[0], start[1])]));
  }
  return paths;
}

function scorePath(
  path: readonly Coordinate[],
  grid: string[][],
  neighborhood: GridNeighborhood,
  dimensions: [number, number]
): number {
  let touchScore = 0;
  if (occupiedCount(grid) > 0) {
    for (const [row, col] of path) {
      if (hasOccupiedNeighbor(grid, row, col, neighborhood, dimensions)) touchScore += 1;
    }
  }
  return touchScore - pathTurnCount(path);
}

function collectPathsForWord(
  grid: string[][],
  length: number,
  neighborhood: GridNeighborhood,
  pathStyle: LayoutPathStyle,
  dimensions: [number, number],
  random: () => number
): Coordinate[][] {
  if (length > emptyCells(grid, dimensions).length) return [];

  const seen = new Set<string>();
  const merged: Coordinate[][] = [];
  const add = (path: Coordinate[]) => {
    const key = pathKey(path);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(path);
  };

  if (pathStyle === 'straight') {
    for (const path of shuffled(
      collectStraightPaths(grid, length, STRAIGHT_DIRECTIONS, dimensions),
      random
    ).slice(0, MAX_PATHS_PER_WORD)) {
      add(path);
    }
    return merged;
  }

  for (const path of shuffled(
    collectStraightPaths(grid, length, neighborhoodDirections(neighborhood), dimensions),
    random
  ).slice(0, 4)) {
    add(path);
  }
  for (const path of collectFlexiblePaths(
    grid,
    length,
    neighborhood,
    dimensions,
    random,
    Math.max(2, MAX_PATHS_PER_WORD - merged.length)
  )) {
    add(path);
  }

  return merged
    .toSorted(
      (left, right) =>
        scorePath(right, grid, neighborhood, dimensions) -
        scorePath(left, grid, neighborhood, dimensions)
    )
    .slice(0, MAX_PATHS_PER_WORD);
}

function placeSyllables(
  grid: string[][],
  path: readonly Coordinate[],
  syllables: readonly string[]
): string[][] {
  const next = cloneGrid(grid);
  for (let index = 0; index < path.length; index += 1) {
    const [row, col] = path[index]!;
    next[row]![col] = syllables[index]!;
  }
  return next;
}

function layoutScore(
  grid: string[][],
  placements: readonly InternalPlacement[]
): GeneratedLayoutScore {
  const bounds = gridBounds(grid);
  const compactness =
    bounds === null ? 0 : (bounds.maxRow - bounds.minRow + 1) * (bounds.maxCol - bounds.minCol + 1);
  const placedSyllableCount = placements.reduce(
    (total, placement) => total + placement.word.syllables.length,
    0
  );
  const cellCount = grid.length * (grid[0]?.length ?? 0);
  return {
    placedWordCount: placements.length,
    placedSyllableCount,
    emptyCellCount: Math.max(0, cellCount - placedSyllableCount),
    compactness,
    turnCount: placements.reduce((total, placement) => total + pathTurnCount(placement.path), 0)
  };
}

function rebuildGridFromPlacements(
  placements: readonly InternalPlacement[],
  dimensions: [number, number]
): string[][] {
  let grid = createEmptyGridData(dimensions);
  for (const placement of placements) {
    grid = placeSyllables(grid, placement.path, placement.word.syllables);
  }
  return grid;
}

function isPlayableLayout(
  grid: string[][],
  placements: readonly InternalPlacement[],
  dimensions: [number, number],
  neighborhood: GridNeighborhood
): boolean {
  if (placements.length === 0) return false;
  const words = placements.map((placement) => placement.word.normalized);
  const traversalsMap = findAllTraversals(grid, dimensions, words, neighborhood);
  const owners = new Map<string, number>();

  for (let index = 0; index < words.length; index += 1) {
    const traversals = traversalsMap.get(index) ?? [];
    if (traversals.length !== 1) return false;
    for (const [row, col] of traversals[0]!) {
      const key = cellKey(row, col);
      const owner = owners.get(key);
      if (owner !== undefined && owner !== index) return false;
      owners.set(key, index);
    }
  }
  return true;
}

/**
 * Drop ambiguous words until the remaining pack has unique traversals.
 * Dense packs often maximize fill but fail playability under n8.
 */
function trimToPlayablePlacements(
  placements: readonly InternalPlacement[],
  dimensions: [number, number],
  neighborhood: GridNeighborhood
): { grid: string[][]; placements: InternalPlacement[] } | null {
  let current = [...placements];
  while (current.length > 0) {
    const grid = rebuildGridFromPlacements(current, dimensions);
    if (isPlayableLayout(grid, current, dimensions, neighborhood)) {
      return { grid, placements: current };
    }

    const words = current.map((placement) => placement.word.normalized);
    const traversalsMap = findAllTraversals(grid, dimensions, words, neighborhood);
    let dropIndex = current.length - 1;
    let worstTraversalCount = -1;
    for (let index = 0; index < current.length; index += 1) {
      const traversalCount = (traversalsMap.get(index) ?? []).length;
      if (traversalCount === 1) continue;
      if (traversalCount > worstTraversalCount) {
        worstTraversalCount = traversalCount;
        dropIndex = index;
      }
    }
    current = current.filter((_, index) => index !== dropIndex);
  }
  return null;
}

function toCandidate(
  placements: InternalPlacement[],
  allWords: readonly PreparedWord[],
  neighborhood: GridNeighborhood,
  dimensions: [number, number]
): GeneratedPadavaliLayout | null {
  const playable = trimToPlayablePlacements(placements, dimensions, 'n8');
  if (!playable) return null;
  const { grid, placements: kept } = playable;
  const placed = new Set(kept.map((placement) => placement.slotIndex));
  return {
    gridData: cloneGrid(grid),
    neighborhood,
    placements: kept.map(({ slotIndex, path }) => ({
      slotIndex,
      path: path.map((cell): Coordinate => [cell[0], cell[1]])
    })),
    placedSlotIndices: kept.map((placement) => placement.slotIndex),
    omittedSlotIndices: allWords
      .filter((word) => !placed.has(word.slotIndex))
      .map((word) => word.slotIndex),
    score: layoutScore(grid, kept)
  };
}

function candidateKey(candidate: GeneratedPadavaliLayout): string {
  return candidate.gridData.map((row) => row.join('\0')).join('\n');
}

function neighborhoodForAttempt(mode: LayoutNeighborhoodMode, attempt: number): GridNeighborhood {
  if (mode === 'n4' || mode === 'n8') return mode;
  return attempt % 2 === 0 ? 'n8' : 'n4';
}

function isBetterScore(
  current: GeneratedLayoutScore,
  best: GeneratedLayoutScore,
  pathStyle: LayoutPathStyle
): boolean {
  if (current.placedWordCount !== best.placedWordCount) {
    return current.placedWordCount > best.placedWordCount;
  }
  if (current.emptyCellCount !== best.emptyCellCount) {
    return current.emptyCellCount < best.emptyCellCount;
  }
  if (current.compactness !== best.compactness) {
    return current.compactness < best.compactness;
  }
  if (pathStyle === 'straight' && current.turnCount !== best.turnCount) {
    return current.turnCount < best.turnCount;
  }
  return false;
}

function prepareWords(
  words: readonly { word: string; added?: boolean; slotIndex?: number }[]
): PreparedWord[] {
  const prepared: PreparedWord[] = [];
  for (let slotIndex = 0; slotIndex < words.length; slotIndex += 1) {
    const entry = words[slotIndex]!;
    if (!isWordAdded(entry)) continue;
    const normalized = entry.word.normalize('NFC').trim();
    const syllables = splitDevanagariAksharas(normalized);
    if (syllables.length === 0) continue;
    prepared.push({
      slotIndex: entry.slotIndex ?? slotIndex,
      word: entry.word,
      normalized,
      syllables
    });
  }
  return prepared;
}

/**
 * Pack added Padavali words as disjoint akṣara-paths on a fixed-size grid.
 * Words that cannot fit stay omitted so applying a partial candidate is safe.
 */
export function generatePadavaliLayouts({
  words,
  dimensions,
  maxCandidates = DEFAULT_MAX_CANDIDATES,
  attempts = DEFAULT_ATTEMPTS,
  seed = 1,
  neighborhood = 'n8',
  pathStyle = 'flexible'
}: {
  words: readonly { word: string; added?: boolean; slotIndex?: number }[];
  dimensions: [number, number];
  maxCandidates?: number;
  attempts?: number;
  seed?: number;
  neighborhood?: LayoutNeighborhoodMode;
  pathStyle?: LayoutPathStyle;
}): GeneratedPadavaliLayout[] {
  const prepared = prepareWords(words);
  if (prepared.length === 0 || dimensions[0] < 1 || dimensions[1] < 1) return [];

  const candidates: GeneratedPadavaliLayout[] = [];
  const candidateKeys = new Set<string>();
  const random = createRandom(seed);

  for (let attempt = 0; attempt < attempts && candidates.length < maxCandidates; attempt += 1) {
    const attemptNeighborhood = neighborhoodForAttempt(neighborhood, attempt);
    const orderedWords = shuffled(prepared, random).toSorted(
      (left, right) => right.syllables.length - left.syllables.length
    );
    let searchNodes = 0;
    const best: {
      current: {
        grid: string[][];
        placements: InternalPlacement[];
        score: GeneratedLayoutScore;
      } | null;
    } = { current: null };

    const search = (index: number, grid: string[][], placements: InternalPlacement[]) => {
      if (searchNodes >= DEFAULT_SEARCH_NODES) return;
      searchNodes += 1;
      const currentScore = layoutScore(grid, placements);
      if (!best.current || isBetterScore(currentScore, best.current.score, pathStyle)) {
        best.current = { grid, placements, score: currentScore };
      }
      if (index >= orderedWords.length) return;

      const word = orderedWords[index]!;
      const paths = collectPathsForWord(
        grid,
        word.syllables.length,
        attemptNeighborhood,
        pathStyle,
        dimensions,
        random
      );
      for (const path of paths) {
        const nextGrid = placeSyllables(grid, path, word.syllables);
        search(index + 1, nextGrid, [...placements, { slotIndex: word.slotIndex, path, word }]);
        if (searchNodes >= DEFAULT_SEARCH_NODES) return;
      }
      search(index + 1, grid, placements);
    };

    search(0, createEmptyGridData(dimensions), []);
    if (!best.current || best.current.placements.length === 0) continue;
    const candidate = toCandidate(
      best.current.placements,
      prepared,
      attemptNeighborhood,
      dimensions
    );
    if (!candidate) continue;
    const key = candidateKey(candidate);
    if (candidateKeys.has(key)) continue;
    candidateKeys.add(key);
    candidates.push(candidate);
  }

  // Last resort: one-word packs so the UI never hits an empty result when anything fits.
  if (candidates.length === 0) {
    const fallbackNeighborhood =
      neighborhood === 'n4' || neighborhood === 'n8' ? neighborhood : 'n8';
    for (const word of prepared) {
      const paths = collectPathsForWord(
        createEmptyGridData(dimensions),
        word.syllables.length,
        fallbackNeighborhood,
        pathStyle,
        dimensions,
        random
      );
      for (const path of paths) {
        const candidate = toCandidate(
          [{ slotIndex: word.slotIndex, path, word }],
          prepared,
          fallbackNeighborhood,
          dimensions
        );
        if (!candidate) continue;
        const key = candidateKey(candidate);
        if (candidateKeys.has(key)) continue;
        candidateKeys.add(key);
        candidates.push(candidate);
        if (candidates.length >= maxCandidates) break;
      }
      if (candidates.length >= maxCandidates) break;
    }
  }

  return rankGeneratedLayouts(candidates, 'words');
}

/** Sort existing candidates without generating new ones. */
export function rankGeneratedLayouts(
  candidates: readonly GeneratedPadavaliLayout[],
  ranking: LayoutRanking
): GeneratedPadavaliLayout[] {
  const sorted = [...candidates];
  sorted.sort((left, right) => {
    const scoreDifference =
      ranking === 'words'
        ? right.score.placedWordCount - left.score.placedWordCount ||
          left.score.emptyCellCount - right.score.emptyCellCount ||
          left.score.compactness - right.score.compactness
        : left.score.emptyCellCount - right.score.emptyCellCount ||
          right.score.placedWordCount - left.score.placedWordCount ||
          left.score.compactness - right.score.compactness;
    return (
      scoreDifference ||
      left.score.turnCount - right.score.turnCount ||
      candidateKey(left).localeCompare(candidateKey(right))
    );
  });
  return sorted;
}
