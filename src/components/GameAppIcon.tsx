import { Image } from '@unpic/react';

import { cn } from '@/lib/utils';
import type { GameKind } from '~/util/catalog/tags';

export type GameAppIconId = GameKind;

export const GAME_APP_ICON_SRC = {
  padavali: '/img/padavali_icons/icon_128_no_pad.png',
  padajala: '/img/padajala_icons/icon_128_no_pad.png',
  dvayi: '/img/dvayi_icons/icon_128_no_pad.png',
  bhramita: '/img/bhramita_icons/icon_128_no_pad.png',
  surupa: '/img/surupa_icons/icon_128_no_pad.png',
  anveshi: '/img/anveshi_icons/icon_128_no_pad.png'
} satisfies Record<GameAppIconId, string>;

/** Per-game plate — complements each mark with a color-matched wash. */

/** Per-game plate — complements each mark (blue puzzle / amber padajala). */
const GAME_APP_ICON_SHELL = {
  padavali: cn(
    'flex shrink-0 items-center justify-center rounded-2xl',
    'border border-blue-300/50 bg-linear-to-br from-blue-100 via-sky-50 to-indigo-200',
    'shadow-md shadow-blue-500/20',
    'dark:border-blue-500/35 dark:from-blue-950 dark:via-slate-950 dark:to-indigo-950',
    'dark:shadow-blue-900/40'
  ),
  padajala: cn(
    'flex shrink-0 items-center justify-center rounded-2xl',
    'border border-amber-300/55 bg-linear-to-br from-amber-100 via-orange-50 to-amber-200',
    'shadow-md shadow-amber-500/25',
    'dark:border-amber-500/40 dark:from-amber-950 dark:via-orange-950/80 dark:to-stone-950',
    'dark:shadow-amber-900/40'
  ),
  dvayi: cn(
    'flex shrink-0 items-center justify-center rounded-2xl',
    'border border-rose-300/55 bg-linear-to-br from-rose-100 via-orange-50 to-amber-200',
    'shadow-md shadow-rose-500/25',
    'dark:border-rose-500/40 dark:from-rose-950 dark:via-slate-950 dark:to-orange-950',
    'dark:shadow-rose-900/40'
  ),
  bhramita: cn(
    'flex shrink-0 items-center justify-center rounded-2xl',
    'border border-emerald-300/55 bg-linear-to-br from-emerald-100 via-teal-50 to-cyan-200',
    'shadow-md shadow-emerald-500/25',
    'dark:border-emerald-500/40 dark:from-emerald-950 dark:via-slate-950 dark:to-teal-950',
    'dark:shadow-emerald-900/40'
  ),
  surupa: cn(
    'flex shrink-0 items-center justify-center rounded-2xl',
    'border border-violet-300/55 bg-linear-to-br from-violet-100 via-fuchsia-50 to-purple-200',
    'shadow-md shadow-violet-500/25',
    'dark:border-violet-500/40 dark:from-violet-950 dark:via-slate-950 dark:to-fuchsia-950',
    'dark:shadow-violet-900/40'
  ),
  anveshi: cn(
    'flex shrink-0 items-center justify-center rounded-2xl',
    'border border-sky-300/55 bg-linear-to-br from-sky-100 via-indigo-50 to-blue-200',
    'shadow-md shadow-sky-500/25',
    'dark:border-sky-500/40 dark:from-sky-950 dark:via-slate-950 dark:to-indigo-950',
    'dark:shadow-sky-900/40'
  )
} satisfies Record<GameAppIconId, string>;

const SIZE = {
  sm: { shell: 'size-11', img: 'size-7', px: 28 },
  md: { shell: 'size-14', img: 'size-9', px: 36 },
  lg: { shell: 'size-16', img: 'size-11', px: 44 }
} as const;

type GameAppIconProps = {
  game: GameAppIconId;
  name: string;
  size?: keyof typeof SIZE;
  className?: string;
};

/**
 * Every game's mark on a color-matched plate.
 * For cards & cross-promo only — AppBar uses GAME_APP_ICON_SRC bare.
 */
export function GameAppIcon({ game, name, size = 'md', className }: GameAppIconProps) {
  const dims = SIZE[size];
  return (
    <div className={cn(GAME_APP_ICON_SHELL[game], dims.shell, className)}>
      <Image
        src={GAME_APP_ICON_SRC[game]}
        alt={`${name} icon`}
        width={dims.px}
        height={dims.px}
        className={cn(dims.img, 'drop-shadow-md')}
      />
    </div>
  );
}
