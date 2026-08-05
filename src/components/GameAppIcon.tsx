import Image from 'next/image';

import { cn } from '@/lib/utils';

export type GameAppIconId = 'padavali' | 'padajala';

export const GAME_APP_ICON_SRC: Record<GameAppIconId, string> = {
  padavali: '/img/icon_128_no_pad.png',
  padajala: '/img/padajala_icons/icon_128_no_pad.png'
};

/** Per-game plate — complements each mark (blue puzzle / amber crossword). */
const GAME_APP_ICON_SHELL: Record<GameAppIconId, string> = {
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
  )
};

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
 * Padāvalī / Padajāla mark on a color-matched plate.
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
