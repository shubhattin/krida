import { describe, expect, it } from 'vitest';
import { analyzeWordPlacements } from './placement';
import {
  generateCrosswordLayouts,
  rankGeneratedLayouts,
  type GeneratedCrosswordLayout,
  type LayoutGeneratorWord
} from './layout_generator';

const words: LayoutGeneratorWord[] = [
  { id: 'cat', word: 'CAT', description: 'feline' },
  { id: 'car', word: 'CAR', description: 'vehicle' },
  { id: 'art', word: 'ART', description: 'creative work' }
];

function analysisFor(
  candidate: GeneratedCrosswordLayout,
  sourceWords: readonly LayoutGeneratorWord[]
) {
  const placedIds = new Set(candidate.placedIds);
  return analyzeWordPlacements(
    candidate.gridData,
    sourceWords.map((word) => ({
      word: word.word,
      description: word.description ?? '',
      added: placedIds.has(word.id)
    }))
  );
}

function playableCellsAreConnected(candidate: GeneratedCrosswordLayout): boolean {
  const startRow = candidate.gridData.findIndex((row) => row.some((cell) => cell.text.length > 0));
  if (startRow === -1) return false;
  const startCol = candidate.gridData[startRow]!.findIndex((cell) => cell.text.length > 0);
  const visited = new Set([`${startRow},${startCol}`]);
  const queue: [number, number][] = [[startRow, startCol]];
  for (let index = 0; index < queue.length; index += 1) {
    const [row, col] = queue[index]!;
    for (const [nextRow, nextCol] of [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1]
    ]) {
      if (candidate.gridData[nextRow]?.[nextCol]?.text.length !== 1) continue;
      const key = `${nextRow},${nextCol}`;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push([nextRow, nextCol]);
    }
  }
  return visited.size === candidate.gridData.flat().filter((cell) => cell.text.length === 1).length;
}

describe('crossword layout generator', () => {
  it('produces valid fixed-size candidates with intersections', () => {
    const candidates = generateCrosswordLayouts({
      words,
      dimensions: [5, 5],
      seed: 12,
      attempts: 36
    });

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0]!.score.placedWordCount).toBeGreaterThanOrEqual(2);
    expect(candidates.some((candidate) => candidate.score.intersectionCount > 0)).toBe(true);
    for (const candidate of candidates) {
      expect(candidate.gridData).toHaveLength(5);
      expect(candidate.gridData.every((row) => row.length === 5)).toBe(true);
      const analysis = analysisFor(candidate, words);
      expect(analysis.hasAllValid).toBe(true);
      expect(analysis.noVisibleHintWords).toHaveLength(0);
      expect(playableCellsAreConnected(candidate)).toBe(true);
    }
  });

  it('offers distinct candidate arrangements', () => {
    const candidates = generateCrosswordLayouts({
      words,
      dimensions: [5, 5],
      seed: 4,
      attempts: 48,
      maxCandidates: 4
    });
    const keys = new Set(
      candidates.map((candidate) =>
        candidate.placements
          .toSorted((left, right) => left.id.localeCompare(right.id))
          .map((placement) => `${placement.id}:${placement.location}:${placement.direction}`)
          .join('|')
      )
    );

    expect(candidates.length).toBeGreaterThan(1);
    expect(keys.size).toBe(candidates.length);
  });

  it('omits incompatible, duplicate, and empty entries without invalidating the applied layout', () => {
    const sourceWords: LayoutGeneratorWord[] = [
      { id: 'cat', word: 'CAT' },
      { id: 'dog', word: 'DOG' },
      { id: 'duplicate-cat', word: 'cat' },
      { id: 'empty', word: '   ' }
    ];
    const candidates = generateCrosswordLayouts({
      words: sourceWords,
      dimensions: [3, 3],
      seed: 8,
      attempts: 12
    });

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0]!.placedIds).toHaveLength(1);
    expect(['cat', 'dog']).toContain(candidates[0]!.placedIds[0]);
    expect(candidates[0]!.omittedIds).toEqual(
      expect.arrayContaining(['dog', 'duplicate-cat', 'empty'])
    );
    expect(analysisFor(candidates[0]!, sourceWords).hasAllValid).toBe(true);
  });

  it('ranks an existing candidate set deterministically without regeneration', () => {
    const makeCandidate = (
      id: string,
      score: GeneratedCrosswordLayout['score']
    ): GeneratedCrosswordLayout => ({
      gridData: [],
      placements: [{ id, location: [0, 0], direction: 'horizontal' }],
      placedIds: [id],
      omittedIds: [],
      score
    });
    const candidates = [
      makeCandidate('few', {
        placedWordCount: 1,
        placedLetterCount: 8,
        intersectionCount: 1,
        compactness: 8,
        gapCount: 0
      }),
      makeCandidate('crossed', {
        placedWordCount: 2,
        placedLetterCount: 7,
        intersectionCount: 3,
        compactness: 9,
        gapCount: 2
      }),
      makeCandidate('letters', {
        placedWordCount: 2,
        placedLetterCount: 12,
        intersectionCount: 2,
        compactness: 12,
        gapCount: 1
      })
    ];

    expect(
      rankGeneratedLayouts(candidates, 'intersections').map((candidate) => candidate.placedIds[0])
    ).toEqual(['crossed', 'letters', 'few']);
    expect(
      rankGeneratedLayouts(candidates, 'words').map((candidate) => candidate.placedIds[0])
    ).toEqual(['letters', 'crossed', 'few']);
    expect(
      rankGeneratedLayouts(candidates, 'letters').map((candidate) => candidate.placedIds[0])
    ).toEqual(['letters', 'few', 'crossed']);
  });

  it('biases letter concentration toward left vs right density', () => {
    const averageColumn = (candidate: GeneratedCrosswordLayout) => {
      let sum = 0;
      let count = 0;
      for (const row of candidate.gridData) {
        for (let col = 0; col < row.length; col += 1) {
          if (row[col]!.text.length !== 1) continue;
          sum += col;
          count += 1;
        }
      }
      return count === 0 ? 0 : sum / count;
    };

    const left = generateCrosswordLayouts({
      words,
      dimensions: [8, 8],
      seed: 21,
      attempts: 48,
      maxCandidates: 4,
      density: 'left'
    });
    const right = generateCrosswordLayouts({
      words,
      dimensions: [8, 8],
      seed: 21,
      attempts: 48,
      maxCandidates: 4,
      density: 'right'
    });

    expect(left.length).toBeGreaterThan(0);
    expect(right.length).toBeGreaterThan(0);
    expect(averageColumn(left[0]!)).toBeLessThan(averageColumn(right[0]!));
  });
});
