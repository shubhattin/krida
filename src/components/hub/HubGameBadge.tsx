import { Image } from '@unpic/react';
import { GAME_APP_ICON_SRC } from '~/components/GameAppIcon';
import { HUB_GAME_ACCENT, HUB_GAMES } from './hub_games';
import type { PublicGameKind } from '~/util/games/kinds';
import { cn } from '~/lib/utils';

export function HubGameBadge({
  game,
  className,
  variant = 'icon'
}: {
  game: PublicGameKind;
  className?: string;
  variant?: 'icon' | 'label';
}) {
  const meta = HUB_GAMES[game];
  const accent = HUB_GAME_ACCENT[meta.kind];

  if (variant === 'label') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase shadow-sm',
          accent.badge,
          className
        )}
      >
        <Image
          src={GAME_APP_ICON_SRC[meta.icon]}
          alt=""
          width={12}
          height={12}
          className="size-3"
        />
        {meta.name}
      </span>
    );
  }

  return (
    <span
      title={meta.name}
      aria-label={meta.name}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-xl border bg-white/90 shadow-md backdrop-blur-sm transition-transform duration-200 dark:bg-slate-950/85',
        accent.iconWell,
        className
      )}
    >
      <Image
        src={GAME_APP_ICON_SRC[meta.icon]}
        alt=""
        width={20}
        height={20}
        className="size-5 drop-shadow-sm"
      />
    </span>
  );
}
