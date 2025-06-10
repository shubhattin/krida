export type Coordinate = [number, number];
export type Traversal = Coordinate[];

/**
 * Finds all possible ways to traverse the grid to form each word in the list.
 * Returns a map from word index to an array of traversals (each traversal is an array of coordinates).
 */
export function findAllTraversals(
  gridData: string[][],
  gridDimensions: [number, number],
  wordList: string[]
): Map<number, Traversal[]> {
  const [rows, cols] = gridDimensions;
  const result = new Map<number, Traversal[]>();

  // All 8 directions
  const directions: Coordinate[] = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1]
  ];

  for (let wIdx = 0; wIdx < wordList.length; wIdx++) {
    const word = wordList[wIdx];
    const traversals: Traversal[] = [];

    // Visited matrix to track cells used in current path
    const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));

    function dfs(r: number, c: number, pos: number, path: Coordinate[]) {
      const cellStr = gridData[r][c];
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
