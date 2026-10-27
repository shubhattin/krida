import { createFileRoute, redirect } from '@tanstack/react-router';
import { useHubData } from '~/components/hub/hub_query';
import { z } from 'zod';
import { routeHeadFromPageMeta, siteUrl } from '~/components/tags/getPageMetaTags';
import HubPuzzles from '~/components/hub/HubPuzzles';
import { HUB_GAMES } from '~/components/hub/hub_games';
import { GAME_KINDS, type GameKind } from '~/util/catalog/tags';

const puzzles_search_schema = z.object({
  game: z
    .enum(['all', ...GAME_KINDS])
    .catch('all')
    .default('all'),
  view: z.enum(['puzzles', 'collections']).catch('puzzles').default('puzzles'),
  tag: z.string().max(80).optional().catch(undefined),
  q: z.string().max(200).optional().catch(undefined),
  /** 1-based; omitted from the URL when on page 1. */
  page: z.coerce.number().int().min(1).optional().catch(undefined)
});

export type PuzzlesSearch = z.infer<typeof puzzles_search_schema>;

/** `?game=` description; the title and share image come from the game itself. */
const GAME_PUZZLES_DESCRIPTION = {
  padavali:
    'Browse Sanskrit word-search puzzles from Padāvalī — find hidden words across Indian scripts.',
  padajala:
    'Browse Sanskrit padajala puzzles from Padajāla — solve grids and grow your vocabulary.',
  dvayi:
    'Browse Dvayī match-the-following Sanskrit puzzles — pair each prompt with its counterpart.',
  bhramita:
    'Browse Bhramitā jumbled-word Sanskrit puzzles — unscramble Devanagari syllables into the word.',
  surupa:
    'Browse Surūpa spelling puzzles — pick the right syllable at each step and restore the word.',
  anveshi:
    'Browse Anveṣī multiple-choice Sanskrit quizzes — answer questions with hints and explanations.'
} satisfies Record<GameKind, string>;

function puzzlesMetaForGame(game: PuzzlesSearch['game']) {
  if (game === 'all') {
    return {
      title: 'Sanskrit Puzzles | Krida',
      project: 'landing_page',
      description:
        'Browse every Sanskrit puzzle — Padāvalī word search, Padajāla grids, Dvayī matching, Bhramitā jumbles, Surūpa spelling and Anveṣī quizzes — plus collections and topics.',
      canonical: `${siteUrl()}/puzzles`
    } as const;
  }
  return {
    title: `${HUB_GAMES[game].name} Puzzles | Krida`,
    project: game,
    description: GAME_PUZZLES_DESCRIPTION[game],
    canonical: `${siteUrl()}/puzzles?game=${game}`
  } as const;
}

function puzzlesMetaForSearch(search: PuzzlesSearch) {
  if (search.view === 'collections') {
    return {
      title: 'Sanskrit Collections | Krida',
      project: 'landing_page',
      description:
        'Browse curated Sanskrit puzzle collections — mixed-game playlists across Padāvalī, Padajāla, Dvayī, Bhramitā, Surūpa and Anveṣī.',
      canonical: `${siteUrl()}/puzzles?view=collections`
    } as const;
  }
  return puzzlesMetaForGame(search.game);
}

/**
 * Canonical URL shapes (see #134):
 * - `/puzzles` (all puzzles; `?game=all` and `?view=puzzles` are redundant)
 * - `/puzzles?game=<kind>` (one game; never with `?view=`)
 * - `/puzzles?view=collections` (all collections; never with `?game=` or `?page=`)
 * `?q=`, `?tag=` and (puzzles view only) `?page=` may accompany any of them.
 * Anything else 301-redirects to its canonical form so old bookmarks stay valid.
 */
type CanonicalPuzzlesParams = {
  view?: string;
  game?: string;
  q?: string;
  tag?: string;
  page?: string;
};

function canonicalPuzzlesSearch(search: PuzzlesSearch): CanonicalPuzzlesParams {
  if (search.view === 'collections') {
    const canonical: CanonicalPuzzlesParams = { view: 'collections' };
    if (search.q) canonical.q = search.q;
    if (search.tag) canonical.tag = search.tag;
    return canonical;
  }
  const canonical: CanonicalPuzzlesParams = {};
  if (search.game !== 'all') canonical.game = search.game;
  if (search.q) canonical.q = search.q;
  if (search.tag) canonical.tag = search.tag;
  if (search.page != null && search.page > 1) canonical.page = String(search.page);
  return canonical;
}

function isCanonicalPuzzlesUrl(searchStr: string, search: PuzzlesSearch): boolean {
  const raw = new URLSearchParams(searchStr.startsWith('?') ? searchStr : `?${searchStr}`);
  const canonical = canonicalPuzzlesSearch(search);
  const rawKeys = new Set<string>();
  for (const key of raw.keys()) {
    // Duplicate keys (`?game=a&game=b`) are never canonical.
    if (rawKeys.has(key)) return false;
    rawKeys.add(key);
  }
  if (rawKeys.size !== Object.keys(canonical).length) return false;
  for (const [key, value] of Object.entries(canonical)) {
    if (raw.get(key) !== value) return false;
  }
  return true;
}

export const Route = createFileRoute('/_hub/puzzles')({
  validateSearch: puzzles_search_schema,
  beforeLoad: ({ search, location }) => {
    if (isCanonicalPuzzlesUrl(location.searchStr, search)) return;
    if (search.view === 'collections') {
      throw redirect({
        to: '/puzzles',
        search: {
          view: 'collections' as const,
          q: search.q || undefined,
          tag: search.tag || undefined
        },
        statusCode: 301
      });
    }
    throw redirect({
      to: '/puzzles',
      search: {
        game: search.game !== 'all' ? search.game : undefined,
        q: search.q || undefined,
        tag: search.tag || undefined,
        page: search.page != null && search.page > 1 ? search.page : undefined
      },
      statusCode: 301
    });
  },
  head: ({ match }) => routeHeadFromPageMeta(puzzlesMetaForSearch(match.search)),
  component: PuzzlesPage
});

function PuzzlesPage() {
  const data = useHubData();
  return <HubPuzzles data={data} />;
}
