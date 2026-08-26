import type { CSSProperties } from 'react';
import { isWordAdded } from '~/util/puzzle/word_list';

/** Soft tint + solid swatch pairs tuned for light and dark editor themes. */
export type WordColorTone = {
  /** Soft translucent background for grid cells / accents */
  bg: string;
  /** Solid marker beside word rows */
  swatch: string;
};

export type WordColorPair = {
  id: string;
  light: WordColorTone;
  dark: WordColorTone;
};

export type CellWordColorInfo = {
  slotIndex: number;
  conflict: boolean;
};

/**
 * Curated palette — readable Devanagari on soft tints, distinct hues,
 * and matching light/dark pairs. Assignment is stable by word-slot index.
 *
 * Dark tints use mid lightness + higher opacity so colors separate on navy
 * UI chrome (cool blues especially used to collapse into similar mud).
 * Warm/cool hues are interleaved so early word slots stay easy to tell apart.
 */
export const WORD_COLOR_PALETTE: readonly WordColorPair[] = [
  {
    id: 'aqua',
    light: { bg: 'hsla(192, 85%, 42%, 0.18)', swatch: 'hsl(192, 80%, 38%)' },
    dark: { bg: 'hsla(192, 85%, 58%, 0.42)', swatch: 'hsl(192, 90%, 68%)' }
  },
  {
    id: 'amber',
    light: { bg: 'hsla(38, 95%, 45%, 0.2)', swatch: 'hsl(32, 90%, 42%)' },
    dark: { bg: 'hsla(38, 95%, 58%, 0.4)', swatch: 'hsl(38, 95%, 64%)' }
  },
  {
    id: 'rose',
    light: { bg: 'hsla(340, 75%, 50%, 0.16)', swatch: 'hsl(340, 70%, 45%)' },
    dark: { bg: 'hsla(340, 80%, 62%, 0.4)', swatch: 'hsl(340, 85%, 72%)' }
  },
  {
    id: 'lime',
    light: { bg: 'hsla(88, 60%, 40%, 0.18)', swatch: 'hsl(88, 55%, 34%)' },
    dark: { bg: 'hsla(92, 60%, 52%, 0.4)', swatch: 'hsl(92, 65%, 62%)' }
  },
  {
    id: 'violet',
    light: { bg: 'hsla(278, 70%, 48%, 0.15)', swatch: 'hsl(278, 65%, 46%)' },
    dark: { bg: 'hsla(278, 75%, 68%, 0.4)', swatch: 'hsl(278, 80%, 76%)' }
  },
  {
    id: 'orange',
    light: { bg: 'hsla(18, 90%, 50%, 0.16)', swatch: 'hsl(18, 85%, 45%)' },
    dark: { bg: 'hsla(18, 90%, 58%, 0.4)', swatch: 'hsl(18, 95%, 66%)' }
  },
  {
    id: 'teal',
    light: { bg: 'hsla(162, 70%, 36%, 0.16)', swatch: 'hsl(162, 70%, 32%)' },
    dark: { bg: 'hsla(162, 65%, 48%, 0.42)', swatch: 'hsl(162, 70%, 58%)' }
  },
  {
    id: 'fuchsia',
    light: { bg: 'hsla(312, 70%, 48%, 0.14)', swatch: 'hsl(312, 65%, 44%)' },
    dark: { bg: 'hsla(312, 75%, 66%, 0.4)', swatch: 'hsl(312, 80%, 74%)' }
  },
  {
    id: 'gold',
    light: { bg: 'hsla(48, 90%, 42%, 0.2)', swatch: 'hsl(44, 85%, 38%)' },
    dark: { bg: 'hsla(48, 90%, 55%, 0.4)', swatch: 'hsl(48, 95%, 64%)' }
  },
  {
    id: 'periwinkle',
    // Distinct lavender-blue — kept far from aqua/teal in hue + lightness
    light: { bg: 'hsla(248, 70%, 55%, 0.16)', swatch: 'hsl(248, 65%, 52%)' },
    dark: { bg: 'hsla(248, 78%, 72%, 0.4)', swatch: 'hsl(248, 85%, 78%)' }
  },
  {
    id: 'emerald',
    light: { bg: 'hsla(148, 70%, 36%, 0.16)', swatch: 'hsl(148, 65%, 32%)' },
    dark: { bg: 'hsla(148, 65%, 50%, 0.4)', swatch: 'hsl(148, 70%, 58%)' }
  },
  {
    id: 'coral',
    light: { bg: 'hsla(8, 80%, 52%, 0.16)', swatch: 'hsl(8, 75%, 48%)' },
    dark: { bg: 'hsla(8, 85%, 62%, 0.4)', swatch: 'hsl(8, 90%, 70%)' }
  }
] as const;

/** Shared-cell conflict tint (overrides per-word color on the grid). */
export const WORD_COLOR_CONFLICT: WordColorPair = {
  id: 'conflict',
  light: { bg: 'hsla(0, 84%, 55%, 0.2)', swatch: 'hsl(0, 75%, 48%)' },
  dark: { bg: 'hsla(0, 80%, 60%, 0.45)', swatch: 'hsl(0, 85%, 68%)' }
};

export function getWordColorPair(slotIndex: number): WordColorPair {
  const palette = WORD_COLOR_PALETTE;
  return palette[((slotIndex % palette.length) + palette.length) % palette.length]!;
}

/** Slot indices of added, non-empty words — aligned with `findAllTraversals` word indices. */
export function getActiveNonEmptyWordSlotIndices(
  wordList: readonly { word: string; added?: boolean }[]
): number[] {
  const indices: number[] = [];
  for (let i = 0; i < wordList.length; i++) {
    const entry = wordList[i]!;
    if (isWordAdded(entry) && entry.word.trim() !== '') {
      indices.push(i);
    }
  }
  return indices;
}

/**
 * Maps `"r,c"` → owning word slot (first owner) and whether multiple words share the cell.
 * Traversal map keys are indices into the active non-empty word list.
 */
export function buildCellWordColorMap(
  traversalsMap: Map<number, readonly (readonly [number, number][])[]>,
  validWordSlotIndices: readonly number[]
): Map<string, CellWordColorInfo> {
  const ownersByCell = new Map<string, number[]>();

  for (const [validIdx, traversals] of traversalsMap) {
    const slotIndex = validWordSlotIndices[validIdx];
    if (slotIndex === undefined) continue;

    for (const traversal of traversals) {
      for (const [r, c] of traversal) {
        const key = `${r},${c}`;
        const owners = ownersByCell.get(key);
        if (!owners) {
          ownersByCell.set(key, [slotIndex]);
        } else if (!owners.includes(slotIndex)) {
          owners.push(slotIndex);
        }
      }
    }
  }

  const result = new Map<string, CellWordColorInfo>();
  for (const [key, owners] of ownersByCell) {
    result.set(key, {
      slotIndex: owners[0]!,
      conflict: owners.length > 1
    });
  }
  return result;
}

/** Color map from known placement paths (no path rediscovery). */
export function buildCellWordColorMapFromPlacements(
  placements: readonly { slotIndex: number; path: readonly (readonly [number, number])[] }[]
): Map<string, CellWordColorInfo> {
  const traversalsMap = new Map<number, readonly (readonly [number, number][])[]>();
  const slotIndices: number[] = [];
  for (let index = 0; index < placements.length; index += 1) {
    const placement = placements[index]!;
    slotIndices.push(placement.slotIndex);
    const path = placement.path.map(([row, col]) => [row, col] as [number, number]);
    traversalsMap.set(index, [path]);
  }
  return buildCellWordColorMap(traversalsMap, slotIndices);
}

/** CSS custom properties so light/dark follow the `dark` class without JS theme reads. */
export function wordColorCssVars(pair: WordColorPair): CSSProperties {
  return {
    '--word-tint': pair.light.bg,
    '--word-tint-dark': pair.dark.bg,
    '--word-swatch': pair.light.swatch,
    '--word-swatch-dark': pair.dark.swatch
  } as CSSProperties;
}

/** Soft fill — `!` so it reliably overrides Input `dark:bg-input/30`. */
export const wordColorTintClassName = '!bg-[var(--word-tint)] dark:!bg-[var(--word-tint-dark)]';

/** Tint class + CSS vars for a grid cell, shared by the editor and layout previews. */
export function cellWordTintAppearance(info: CellWordColorInfo | undefined): {
  className: string;
  style: CSSProperties | undefined;
} {
  if (!info) {
    return { className: '', style: undefined };
  }
  const pair = info.conflict ? WORD_COLOR_CONFLICT : getWordColorPair(info.slotIndex);
  return {
    className: wordColorTintClassName,
    style: wordColorCssVars(pair)
  };
}

export const wordColorSwatchClassName =
  '!bg-[var(--word-swatch)] dark:!bg-[var(--word-swatch-dark)]';
