'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRightIcon } from 'lucide-react';
import { useTRPC } from '~/api/client';
import { getCDNUrl } from '~/constants';
import { useDragScroll } from '~/hooks/useDragScroll';
import { gameDisplayName, GamePickerChips, type GamePick } from '~/components/hub/GamePickerChips';
import { puzzleHref } from '~/components/hub/hub_games';
import { GameKindIcon } from '~/components/pages/catalog/GameKindIcon';
import { cn } from '~/lib/utils';
import type { GameKind } from '~/util/catalog/tags';
import type { SimpleGameKind } from '~/util/games/kinds';
import { useTransliteratedText } from '../useTransliteratedText';

const ALL_LIMIT = 16;

type PreviewRow = {
  id: number;
  slug: string;
  title: string;
  description?: string | null;
  last_listed_at?: Date | string | null;
  created_at?: Date | string | null;
  /** Padāvalī / Padajāla cover art; the new games have none yet. */
  image?: { s3_key: string } | null;
};
type FeedItem = {
  game: GameKind;
  id: number;
  slug: string;
  title: string;
  description: string;
  image: string | null;
  at: number;
};

function toFeed(game: GameKind, rows: readonly PreviewRow[] | undefined): FeedItem[] {
  return (rows ?? []).map((row) => ({
    game,
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? '',
    image: row.image ? getCDNUrl(row.image.s3_key) : null,
    at: new Date(row.last_listed_at ?? row.created_at ?? 0).getTime()
  }));
}

/** Where a game's full list lives (new games have their own landing; live games use /puzzles). */
function browseHref(pick: GamePick) {
  if (pick === 'all') return '/puzzles';
  if (pick === 'padavali' || pick === 'padajala') return `/puzzles?game=${pick}`;
  return `/${pick}`;
}

/**
 * Post-game "More puzzles": defaults to the game just played, with an "All" chip that mixes
 * every game by recency. Experimental here first; the chip row is shared with the hub later.
 */
export function MorePuzzles({ kind, puzzleId }: { kind: SimpleGameKind; puzzleId: number }) {
  const trpc = useTRPC();
  const { ref: rowRef, dragging } = useDragScroll<HTMLDivElement>();
  // null = not chosen yet: default to this game if it has other puzzles, else to All.
  const [chosen, setChosen] = useState<GamePick | null>(null);
  const excludeFor = (game: GameKind) => (game === kind ? { exclude_id: puzzleId } : {});

  const padavali = useQuery(
    trpc.puzzle.get_listed_puzzles_preview.queryOptions(excludeFor('padavali'))
  );
  const padajala = useQuery(
    trpc.padajala.get_listed_puzzles_preview.queryOptions(excludeFor('padajala'))
  );
  const dvayi = useQuery(trpc.dvayi.get_listed_puzzles_preview.queryOptions(excludeFor('dvayi')));
  const bhramita = useQuery(
    trpc.bhramita.get_listed_puzzles_preview.queryOptions(excludeFor('bhramita'))
  );
  const surupa = useQuery(
    trpc.surupa.get_listed_puzzles_preview.queryOptions(excludeFor('surupa'))
  );
  const anveshi = useQuery(
    trpc.anveshi.get_listed_puzzles_preview.queryOptions(excludeFor('anveshi'))
  );

  const byGame = useMemo(
    () =>
      ({
        padavali: toFeed('padavali', padavali.data),
        padajala: toFeed('padajala', padajala.data),
        dvayi: toFeed('dvayi', dvayi.data),
        bhramita: toFeed('bhramita', bhramita.data),
        surupa: toFeed('surupa', surupa.data),
        anveshi: toFeed('anveshi', anveshi.data)
      }) satisfies Record<GameKind, FeedItem[]>,
    [padavali.data, padajala.data, dvayi.data, bhramita.data, surupa.data, anveshi.data]
  );

  // Current game first, then the rest; games with nothing listed are dropped from the chips.
  const games = useMemo(() => {
    const order: GameKind[] = [
      kind,
      'padavali',
      'padajala',
      'dvayi',
      'bhramita',
      'surupa',
      'anveshi'
    ];
    return [...new Set(order)].filter((game) => game === kind || byGame[game].length > 0);
  }, [byGame, kind]);

  const all = useMemo(
    () =>
      Object.values(byGame)
        .flat()
        .toSorted((a, b) => b.at - a.at)
        .slice(0, ALL_LIMIT),
    [byGame]
  );
  const counts = useMemo(
    () =>
      ({
        all: all.length,
        ...Object.fromEntries(games.map((game) => [game, byGame[game].length]))
      }) satisfies Partial<Record<GamePick, number>>,
    [all.length, byGame, games]
  );

  const loading = [padavali, padajala, dvayi, bhramita, surupa, anveshi].some(
    (query) => query.isPending
  );
  const pick: GamePick = chosen ?? (loading || byGame[kind].length > 0 ? kind : 'all');
  const items = pick === 'all' ? all : byGame[pick];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-bold">More puzzles</h3>
        <a
          href={browseHref(pick)}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground no-underline transition-colors hover:text-foreground"
        >
          Browse
          <ArrowRightIcon className="size-3.5" />
        </a>
      </div>
      <GamePickerChips
        games={games}
        value={pick}
        onChange={setChosen}
        counts={loading ? undefined : counts}
      />
      <div
        ref={rowRef}
        className={cn(
          '-mx-1 flex [scrollbar-width:thin] gap-3 overflow-x-auto px-1 pb-2 select-none',
          dragging ? 'cursor-grabbing' : 'cursor-grab snap-x'
        )}
      >
        {loading && items.length === 0
          ? Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="h-28 w-60 shrink-0 animate-pulse rounded-2xl border border-border/50 bg-muted/40"
              />
            ))
          : null}
        {!loading && items.length === 0 ? (
          <p className="w-full rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
            No other {pick === 'all' ? '' : `${gameDisplayName(pick)} `}puzzles yet.
          </p>
        ) : null}
        {items.map((item, index) => (
          <PuzzleTile
            key={`${item.game}-${item.id}`}
            item={item}
            index={index}
            showGame={pick === 'all'}
          />
        ))}
      </div>
    </section>
  );
}

function PuzzleTile({
  item,
  index,
  showGame
}: {
  item: FeedItem;
  index: number;
  showGame: boolean;
}) {
  const title = useTransliteratedText(item.title);
  const description = useTransliteratedText(item.description);
  return (
    <motion.a
      href={puzzleHref(item.game, item.slug)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 6) * 0.04 }}
      className={cn(
        item.image ? 'w-80' : 'w-60',
        'group flex shrink-0 snap-start gap-3 rounded-2xl border border-border/70 bg-card/70 p-3.5 no-underline shadow-sm transition-all hover:-translate-y-0.5 hover:border-border hover:shadow-md'
      )}
    >
      {item.image ? <Thumbnail src={item.image} game={item.game} /> : null}
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <GameKindIcon game={item.game} className="size-4" />
          {showGame ? gameDisplayName(item.game) : null}
        </span>
        <span className="line-clamp-1 text-base font-bold text-foreground">{title}</span>
        {description ? (
          <span className="line-clamp-2 text-xs text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </motion.a>
  );
}

/** Small 3:2 cover; falls back to a game-icon tile if the image is missing on the CDN. */
function Thumbnail({ src, game }: { src: string; game: GameKind }) {
  const [failed, setFailed] = useState(false);
  const frame = 'aspect-[3/2] w-20 shrink-0 self-start rounded-lg border border-border/50';
  if (failed) {
    return (
      <span className={cn(frame, 'flex items-center justify-center bg-muted/50')}>
        <GameKindIcon game={game} className="size-6 opacity-70" />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn(frame, 'bg-muted/40 object-cover')}
    />
  );
}
