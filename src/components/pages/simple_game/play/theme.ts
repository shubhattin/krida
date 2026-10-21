import type { SimpleGameKind } from '~/util/games/kinds';

/** Raw colours for play surfaces (SVG strokes, confetti, inline gradients). */
export const PLAY_THEME = {
  dvayi: { from: '#f43f5e', to: '#f97316' },
  bhramita: { from: '#10b981', to: '#0d9488' },
  surupa: { from: '#8b5cf6', to: '#c026d3' },
  anveshi: { from: '#0ea5e9', to: '#4f46e5' }
} as const satisfies Record<SimpleGameKind, { from: string; to: string }>;

export const CORRECT_COLOR = '#10b981';
export const WRONG_COLOR = '#ef4444';

export function playGradient(kind: SimpleGameKind) {
  const theme = PLAY_THEME[kind];
  return `linear-gradient(135deg, ${theme.from}, ${theme.to})`;
}

/** framer-motion keyframes for a "nope" shake. */
export const SHAKE_X = [0, -10, 10, -8, 8, -4, 4, 0];
export const SHAKE_TRANSITION = { duration: 0.45, ease: 'easeInOut' } as const;

export function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}
