/** Distinct accents for matched pairs. Red is reserved for wrong-match feedback. */
const PAIR_COLORS = [
  '#f59e0b',
  '#10b981',
  '#0ea5e9',
  '#a855f7',
  '#ec4899',
  '#84cc16',
  '#06b6d4',
  '#6366f1',
  '#f97316',
  '#14b8a6'
] as const;

export function pairColor(index: number): string {
  return PAIR_COLORS[((index % PAIR_COLORS.length) + PAIR_COLORS.length) % PAIR_COLORS.length]!;
}

/** `#rrggbb` + alpha (0–1) → `#rrggbbaa`. */
export function withAlpha(hex: string, alpha: number): string {
  const value = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${value}`;
}
