export type Coordinate = [number, number];
export type Traversal = Coordinate[];

/** Orthogonal neighbors (up, down, left, right). */
export type GridNeighborhood = 'n4' | 'n8';

export const GRID_DIRECTIONS_N4: readonly Coordinate[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1]
];

/** All adjacent neighbors, including diagonals — how players swipe in the game. */
export const GRID_DIRECTIONS_N8: readonly Coordinate[] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1]
];

export function neighborhoodDirections(neighborhood: GridNeighborhood): readonly Coordinate[] {
  return neighborhood === 'n4' ? GRID_DIRECTIONS_N4 : GRID_DIRECTIONS_N8;
}

/**
 * Finds all possible ways to traverse the grid to form each word in the list.
 * Returns a map from word index to an array of traversals (each traversal is an array of coordinates).
 *
 * Defaults to 8-neighbor moves so results match live play (diagonal swipes allowed).
 */
export function findAllTraversals(
  gridData: string[][],
  gridDimensions: [number, number],
  wordList: string[],
  neighborhood: GridNeighborhood = 'n8'
): Map<number, Traversal[]> {
  const [rows, cols] = gridDimensions;
  const result = new Map<number, Traversal[]>();
  const directions = neighborhoodDirections(neighborhood);

  for (let wIdx = 0; wIdx < wordList.length; wIdx++) {
    const word = wordList[wIdx];
    const traversals: Traversal[] = [];
    if (word.trim() === '') {
      result.set(wIdx, traversals);
      continue;
    }
    // Visited matrix to track cells used in current path
    const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));

    function dfs(r: number, c: number, pos: number, path: Coordinate[]) {
      const cellStr = gridData[r][c];
      if (cellStr.trim() === '') return;
      // Check if the segment matches at current position
      if (!word.startsWith(cellStr, pos)) return;

      visited[r][c] = true;
      path.push([r, c]);

      const nextPos = pos + cellStr.length;
      if (nextPos === word.length) {
        // Found a complete traversal
        traversals.push([...path]);
      } else {
        // Explore neighbors
        for (const [dr, dc] of directions) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
            dfs(nr, nc, nextPos, path);
          }
        }
      }

      // Backtrack
      path.pop();
      visited[r][c] = false;
    }

    // Start DFS from every cell
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        dfs(r, c, 0, []);
      }
    }

    result.set(wIdx, traversals);
  }

  return result;
}

/**
 * Returns a set of all unique coordinates occupied by any traversal across all words.
 */
export function getOccupiedCells(traversalsMap: Map<number, Traversal[]>): Set<Coordinate> {
  const cellSet = new Set<string>();
  for (const traversals of traversalsMap.values()) {
    for (const traversal of traversals) {
      for (const [r, c] of traversal) {
        cellSet.add(`${r},${c}`);
      }
    }
  }

  const result = new Set<Coordinate>();
  for (const coord of cellSet) {
    const [rStr, cStr] = coord.split(',');
    result.add([Number(rStr), Number(cStr)]);
  }
  return result;
}
