import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import { z } from 'zod';
import {
  routeHeadFromPageMeta,
  siteUrl,
  type MetadataProject
} from '~/components/tags/getPageMetaTags';
import HubPuzzles from '~/components/hub/HubPuzzles';

const hubRoute = getRouteApi('/_hub');

const puzzles_search_schema = z.object({
  game: z
    .enum(['all', 'padavali', 'padajala', 'dvayi', 'bhramita', 'surupa', 'anveshi'])
    .catch('all')
    .default('all'),
  view: z.enum(['puzzles', 'collections']).catch('puzzles').default('puzzles'),
  tag: z.string().max(80).optional().catch(undefined),
  q: z.string().max(200).optional().catch(undefined),
  /** 1-based; omitted from the URL when on page 1. */
  page: z.coerce.number().int().min(1).optional().catch(undefined)
});

export type PuzzlesSearch = z.infer<typeof puzzles_search_schema>;

type PuzzlesPageMeta = {
  title: string;
  project: MetadataProject;
  description: string;
};

function puzzlesMetaForGame(game: PuzzlesSearch['game']): PuzzlesPageMeta {
  if (game === 'padavali') {
    return {
      title: 'Padāvalī Puzzles | Krida',
      project: 'padavali',
      description:
        'Browse Sanskrit word-search puzzles from Padāvalī — find hidden words across Indian scripts.'
    };
  }
  if (game === 'padajala') {
    return {
      title: 'Padajāla Puzzles | Krida',
      project: 'padajala',
      description:
        'Browse Sanskrit padajala puzzles from Padajāla — solve grids and grow your vocabulary.'
    };
  }
  if (game === 'dvayi') {
    return {
      title: 'Dvayī Puzzles | Krida',
      project: 'dvayi',
      description:
        'Browse Dvayī match-the-following Sanskrit puzzles — pair each prompt with its counterpart.'
    };
  }
  if (game === 'bhramita') {
    return {
      title: 'Bhramitā Puzzles | Krida',
      project: 'bhramita',
      description:
        'Browse Bhramitā jumbled-word Sanskrit puzzles — unscramble Devanagari syllables into the word.'
    };
  }
  if (game === 'surupa') {
    return {
      title: 'Surūpa Puzzles | Krida',
      project: 'surupa',
      description:
        'Browse Surūpa spelling puzzles — pick the right syllable at each step and restore the word.'
    };
  }
  if (game === 'anveshi') {
    return {
      title: 'Ānveṣī Puzzles | Krida',
      project: 'anveshi',
      description:
        'Browse Ānveṣī multiple-choice Sanskrit quizzes — answer questions with hints and explanations.'
    };
  }
  return {
    title: 'Sanskrit Puzzles | Krida',
    project: 'landing_page',
    description:
      'Browse every Sanskrit puzzle — Padāvalī word search, Padajāla grids, Dvayī matching, Bhramitā jumbles, Surūpa spelling and Ānveṣī quizzes — plus collections and topics.'
  };
}

export const Route = createFileRoute('/_hub/puzzles')({
  validateSearch: puzzles_search_schema,
  head: ({ match }) => {
    const meta = puzzlesMetaForGame(match.search.game);
    return routeHeadFromPageMeta({
      ...meta,
      canonical:
        match.search.game === 'all'
          ? `${siteUrl()}/puzzles`
          : `${siteUrl()}/puzzles?game=${match.search.game}`
    });
  },
  component: PuzzlesPage
});

function PuzzlesPage() {
  const data = hubRoute.useLoaderData();
  return <HubPuzzles data={data} />;
}
