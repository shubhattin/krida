import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { GAME_APP_ICON_SRC } from '~/components/GameAppIcon';
import { cn } from '~/lib/utils';
import type { GameKind } from '~/util/catalog/tags';

const GAME_LABEL = {
  padavali: 'Padavali',
  crossword: 'Padajala'
} as const;

export function gameKindLabel(game: GameKind) {
  return GAME_LABEL[game];
}

/** The game's own mark — same image as its favicon. */
export function GameKindIcon({ game, className }: { game: GameKind; className?: string }) {
  const src = game === 'padavali' ? GAME_APP_ICON_SRC.padavali : GAME_APP_ICON_SRC.padajala;
  return (
    <img
      src={src}
      alt=""
      title={GAME_LABEL[game]}
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
  if (game === 'padavali') {
    return (
      <Link to="/padavali/edit/$id" params={{ id: String(id) }} {...shared}>
        {children}
      </Link>
    );
  }
  return (
    <Link to="/padajala/edit/$id" params={{ id: String(id) }} {...shared}>
      {children}
    </Link>
  );
}
