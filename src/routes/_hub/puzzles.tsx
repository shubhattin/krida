import { createFileRoute } from '@tanstack/react-router';
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
    'Browse Ānveṣī multiple-choice Sanskrit quizzes — answer questions with hints and explanations.'
} satisfies Record<GameKind, string>;

function puzzlesMetaForGame(game: PuzzlesSearch['game']) {
  if (game === 'all') {
    return {
      title: 'Sanskrit Puzzles | Krida',
      project: 'landing_page',
      description:
        'Browse every Sanskrit puzzle — Padāvalī word search, Padajāla grids, Dvayī matching, Bhramitā jumbles, Surūpa spelling and Ānveṣī quizzes — plus collections and topics.',
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

export const Route = createFileRoute('/_hub/puzzles')({
  validateSearch: puzzles_search_schema,
  head: ({ match }) => routeHeadFromPageMeta(puzzlesMetaForGame(match.search.game)),
  component: PuzzlesPage
});

function PuzzlesPage() {
  const data = useHubData();
  return <HubPuzzles data={data} />;
}
