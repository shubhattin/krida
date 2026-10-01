import { Badge } from '~/components/ui/badge';
import { cn } from '~/lib/utils';
import type { GameKind } from '~/util/catalog/tags';
import { HUB_GAMES } from './hub_games';

const GAME_BADGE_CLASS = {
  padavali: 'border-transparent bg-blue-600/92 text-white shadow-sm dark:bg-blue-500/90',
  crossword: 'border-transparent bg-amber-600/92 text-white shadow-sm dark:bg-amber-500/90'
} as const;

export function HubGameBadge({ game, className }: { game: GameKind; className?: string }) {
  return <Badge className={cn(GAME_BADGE_CLASS[game], className)}>{HUB_GAMES[game].name}</Badge>;
}
