import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeftRight, CircleHelp, Shuffle, SpellCheck } from 'lucide-react';
import { GAME_APP_ICON_SRC } from '~/components/GameAppIcon';
import { cn } from '~/lib/utils';
import type { GameKind } from '~/util/catalog/tags';
import { gameKindLabel } from '~/util/games/labels';
import {
  isSimpleGameKind,
  simpleGameEditHref,
  SIMPLE_GAME_META,
  type SimpleGameKind
} from '~/util/games/kinds';

const SIMPLE_GAME_ICON = {
  dvayi: ArrowLeftRight,
  bhramita: Shuffle,
  surupa: SpellCheck,
  anveshi: CircleHelp
} as const satisfies Record<SimpleGameKind, typeof ArrowLeftRight>;

export { gameKindLabel };

/** The game's own mark — favicon for live games, generic glyph while in development. */
export function GameKindIcon({ game, className }: { game: GameKind; className?: string }) {
  if (isSimpleGameKind(game)) {
    const Icon = SIMPLE_GAME_ICON[game];
    const meta = SIMPLE_GAME_META[game];
    return (
      <span
        title={gameKindLabel(game)}
        className={cn(
          'inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] bg-linear-to-br text-white',
          meta.accent.from,
          meta.accent.to,
          className
        )}
      >
        <Icon className="size-3" />
      </span>
    );
  }

  const src = game === 'padavali' ? GAME_APP_ICON_SRC.padavali : GAME_APP_ICON_SRC.padajala;
  return (
    <img
      src={src}
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
  if (game === 'padavali') {
    return (
      <Link to="/padavali/edit/$id" params={{ id: String(id) }} {...shared}>
        {children}
      </Link>
    );
  }
  if (game === 'crossword') {
    return (
      <Link to="/padajala/edit/$id" params={{ id: String(id) }} {...shared}>
        {children}
      </Link>
    );
  }
  return (
    <a href={simpleGameEditHref(game, id)} {...shared}>
      {children}
    </a>
  );
}
