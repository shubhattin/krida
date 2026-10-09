import {
  ArrowLeftRight,
  CircleHelp,
  Shuffle,
  SpellCheck,
  type LucideIcon
} from 'lucide-react';
import { GameAppIcon } from '~/components/GameAppIcon';
import type { AdminAnalyticsGameId } from '~/api/routers/analytics';
import { SIMPLE_GAME_META } from '~/util/games/kinds';
import { cn } from '~/lib/utils';

const SIMPLE_ICONS = {
  dvayi: ArrowLeftRight,
  bhramita: Shuffle,
  surupa: SpellCheck,
  anveshi: CircleHelp
} as const satisfies Record<
  Exclude<AdminAnalyticsGameId, 'padavali' | 'padajala'>,
  LucideIcon
>;

export function GameAnalyticsMark({
  game,
  name,
  className
}: {
  game: AdminAnalyticsGameId;
  name: string;
  className?: string;
}) {
  if (game === 'padavali' || game === 'padajala') {
    return (
      <GameAppIcon
        game={game === 'padavali' ? 'padavali' : 'padajala'}
        name={name}
        size="sm"
        className={className}
      />
    );
  }
  const Icon = SIMPLE_ICONS[game];
  const meta = SIMPLE_GAME_META[game];
  return (
    <span
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-sm',
        meta.accent.from,
        meta.accent.to,
        className
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}
