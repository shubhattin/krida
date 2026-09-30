import { HUB_GAME_ACCENT, HUB_GAMES } from './hub_games';
import type { GameKind } from '~/util/catalog/tags';
import { cn } from '~/lib/utils';

export function HubGameBadge({ game, className }: { game: GameKind; className?: string }) {
  const meta = HUB_GAMES[game];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase shadow-sm',
        HUB_GAME_ACCENT[meta.kind].badge,
        className
      )}
    >
      {meta.name}
    </span>
  );
}
