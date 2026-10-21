import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { GAME_APP_ICON_SRC } from '~/components/GameAppIcon';
import { cn } from '~/lib/utils';
import type { GameKind } from '~/util/catalog/tags';
import { gameKindLabel } from '~/util/games/labels';

export { gameKindLabel };

/** The game's own mark (its app icon). */
export function GameKindIcon({ game, className }: { game: GameKind; className?: string }) {
  return (
    <img
      src={GAME_APP_ICON_SRC[game]}
      alt=""
      title={gameKindLabel(game)}
      className={cn('size-5 shrink-0 rounded-[4px] object-contain', className)}
    />
  );
}

/** Admin editor for a listed puzzle — always opens in a new tab. */
export function PuzzleEditLink({
  game,
  id,
  className,
  children
}: {
  game: GameKind;
  id: number;
  className?: string;
  children: ReactNode;
}) {
  const shared = {
    target: '_blank' as const,
    rel: 'noopener noreferrer',
    className
  };
  return (
    <Link to={`/${game}/edit/$id`} params={{ id: String(id) }} {...shared}>
      {children}
    </Link>
  );
}
