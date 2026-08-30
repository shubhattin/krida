import { describe, expect, it } from 'vitest';
import { findAllTraversals } from '~/tools/puzzle/puzzle_tools';
import { SAMPLE_DATA } from '~/tools/puzzle/sample_puzzle_data';
import {
  generatePadavaliLayouts,
  rankGeneratedLayouts,
  type GeneratedPadavaliLayout
} from './layout_generator';
import { buildCellWordColorMap, getActiveNonEmptyWordSlotIndices } from './word_colors';

const smallWords = [
  { word: 'राम', added: true },
  { word: 'नल', added: true },
  { word: 'यमुना', added: true }
];

function placedWords(candidate: GeneratedPadavaliLayout, source: typeof smallWords) {
  return candidate.placedSlotIndices.map((slotIndex) => source[slotIndex]!.word);
}

function pathStepsAreOrthogonal(candidate: GeneratedPadavaliLayout): boolean {
  return candidate.placements.every((placement) =>
    placement.path.every((cell, index) => {
      if (index === 0) return true;
      const previous = placement.path[index - 1]!;
      const dRow = Math.abs(cell[0] - previous[0]);
      const dCol = Math.abs(cell[1] - previous[1]);
      return dRow + dCol === 1;
    })
  );
}

function pathIsStraightAcrossOrDown(candidate: GeneratedPadavaliLayout): boolean {
  return candidate.placements.every((placement) => {
    if (placement.path.length <= 1) return true;
    const [startRow, startCol] = placement.path[0]!;
    const sameRow = placement.path.every(([row]) => row === startRow);
    const sameCol = placement.path.every(([, col]) => col === startCol);
    if (sameRow) {
      return placement.path.every((cell, index) => cell[1] === startCol + index);
    }
    if (sameCol) {
      return placement.path.every((cell, index) => cell[0] === startRow + index);
    }
    return false;
  });
}

describe('padavali layout generator', () => {
  it('produces unique-path layouts that fill distinct cells', () => {
    const candidates = generatePadavaliLayouts({
      words: smallWords,
      dimensions: [3, 3],
      seed: 11,
      attempts: 24,
      maxCandidates: 8
    });

    expect(candidates.length).toBeGreaterThan(0);
    for (const candidate of candidates) {
      expect(candidate.gridData).toHaveLength(3);
      expect(candidate.gridData.every((row) => row.length === 3)).toBe(true);
      expect(candidate.score.placedWordCount).toBeGreaterThan(0);
      const words = placedWords(candidate, smallWords);
      const traversalsMap = findAllTraversals(
        candidate.gridData,
        [3, 3],
        words,
        candidate.neighborhood
      );
      for (let index = 0; index < words.length; index += 1) {
        expect(traversalsMap.get(index)).toHaveLength(1);
      }
    }
  });

  it('keeps orthogonal-only placements for up/down/left/right neighbors', () => {
    const candidates = generatePadavaliLayouts({
      words: smallWords,
      dimensions: [3, 3],
      seed: 21,
      attempts: 24,
      neighborhood: 'n4'
    });

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((candidate) => candidate.neighborhood === 'n4')).toBe(true);
    expect(candidates.every(pathStepsAreOrthogonal)).toBe(true);
  });

  it('keeps left-to-right and top-to-bottom runs for straight laying', () => {
    const candidates = generatePadavaliLayouts({
      words: smallWords,
      dimensions: [4, 4],
      seed: 7,
      attempts: 24,
      pathStyle: 'straight'
    });

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every(pathIsStraightAcrossOrDown)).toBe(true);
  });

  it('omits words that cannot fit on a tiny grid', () => {
    const candidates = generatePadavaliLayouts({
      words: [
        { word: 'यमुना', added: true },
        { word: 'कावेरी', added: true }
      ],
      dimensions: [2, 2],
      seed: 3,
      attempts: 20
    });

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.some((candidate) => candidate.omittedSlotIndices.length > 0)).toBe(true);
    expect(candidates.every((candidate) => candidate.score.placedSyllableCount <= 4)).toBe(true);
  });

  it('offers distinct candidate arrangements', () => {
    const candidates = generatePadavaliLayouts({
      words: smallWords,
      dimensions: [3, 3],
      seed: 8,
      attempts: 36,
      maxCandidates: 8
    });

    const keys = new Set(candidates.map((candidate) => candidate.gridData.flat().join('|')));
    expect(keys.size).toBe(candidates.length);
  });

  it('reorders without regenerating', () => {
    const candidates = generatePadavaliLayouts({
      words: smallWords,
      dimensions: [3, 3],
      seed: 4,
      attempts: 20
    });
    const byFill = rankGeneratedLayouts(candidates, 'fill');
    const byWords = rankGeneratedLayouts(candidates, 'words');
    expect(byFill).toHaveLength(candidates.length);
    expect(byWords).toHaveLength(candidates.length);
    if (byFill.length > 1) {
      expect(byFill[0]!.score.emptyCellCount).toBeLessThanOrEqual(byFill[1]!.score.emptyCellCount);
    }
  });

  it('packs a full-size 6×6 word list without cell-color conflicts', () => {
    const sample = SAMPLE_DATA[0]!;
    const words = sample.word_list.map((word) => ({ word, added: true }));
    const candidates = generatePadavaliLayouts({
      words,
      dimensions: sample.grid_dimensions,
      seed: 9,
      attempts: 24,
      maxCandidates: 4
    });

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0]!.score.placedWordCount).toBeGreaterThanOrEqual(6);

    const candidate = candidates[0]!;
    const previewList = words.map((entry, index) =>
      candidate.omittedSlotIndices.includes(index) ? { ...entry, added: false } : entry
    );
    const validWords = previewList.filter((entry) => entry.added).map((entry) => entry.word);
    const traversalsMap = findAllTraversals(
      candidate.gridData,
      sample.grid_dimensions,
      validWords,
      candidate.neighborhood
    );
    const colorMap = buildCellWordColorMap(
      traversalsMap,
      getActiveNonEmptyWordSlotIndices(previewList)
    );

    expect(colorMap.size).toBe(candidate.score.placedSyllableCount);
    for (const info of colorMap.values()) {
      expect(info.conflict).toBe(false);
    }
  });

  it('recovers playable layouts from dense packs that would otherwise be empty', () => {
    const denseWords = ['अन', 'नल', 'लम', 'मय', 'यर', 'रत'].map((word) => ({
      word,
      added: true
    }));
    const flexible = generatePadavaliLayouts({
      words: denseWords,
      dimensions: [3, 3],
      seed: 7,
      attempts: 48,
      pathStyle: 'flexible',
      neighborhood: 'n8'
    });
    const straight = generatePadavaliLayouts({
      words: denseWords,
      dimensions: [3, 3],
      seed: 7,
      attempts: 48,
      pathStyle: 'straight',
      neighborhood: 'n8'
    });
    expect(flexible.length).toBeGreaterThan(0);
    expect(straight.length).toBeGreaterThan(0);
    expect(flexible.every((candidate) => candidate.score.placedWordCount > 0)).toBe(true);
  });
});
