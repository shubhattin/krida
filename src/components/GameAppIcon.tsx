import { cn } from '@/lib/utils';

/** Neutral plate behind the puzzle-piece mark — works for both games / themes. */
export const GAME_APP_ICON_SHELL = cn(
  'flex shrink-0 items-center justify-center rounded-xl',
  'border border-slate-200/90 bg-linear-to-br from-slate-100 via-slate-50 to-slate-200/80',
  'shadow-md shadow-slate-900/10',
  'dark:border-slate-600/70 dark:from-slate-700 dark:to-slate-800',
  'dark:shadow-black/30'
);

const SIZE = {
  sm: { shell: 'size-10', img: 'size-6' },
  md: { shell: 'size-12', img: 'size-8' },
  lg: { shell: 'size-14', img: 'size-9' }
} as const;

type GameAppIconProps = {
  name: string;
  size?: keyof typeof SIZE;
  className?: string;
};

/**
 * Shared Padāvalī / Padajāla app mark with a neutral gray background.
 * Used on landing cards, cross-promo banners, and related list routes.
 */
export function GameAppIcon({ name, size = 'md', className }: GameAppIconProps) {
  const dims = SIZE[size];
  return (
    <div className={cn(GAME_APP_ICON_SHELL, dims.shell, className)}>
      <img
        src="/img/icon_128_no_pad.png"
        alt={`${name} icon`}
        className={cn(dims.img, 'drop-shadow-sm')}
      />
    </div>
  );
}
