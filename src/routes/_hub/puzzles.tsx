import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import { z } from 'zod';
import { routeHeadFromPageMeta, type MetadataProject } from '~/components/tags/getPageMetaTags';
import HubPuzzles from '~/components/hub/HubPuzzles';

const hubRoute = getRouteApi('/_hub');

const puzzles_search_schema = z.object({
  // TODO: add dvayi/bhramita/surupa/anveshi to this public filter once those games ship.
  game: z.enum(['all', 'padavali', 'crossword']).catch('all').default('all'),
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
  if (game === 'crossword') {
    return {
      title: 'Padajāla Puzzles | Krida',
      project: 'padajala',
      description:
        'Browse Sanskrit crossword puzzles from Padajāla — solve grids and grow your vocabulary.'
    };
  }
  return {
    title: 'Sanskrit Puzzles | Krida',
    project: 'landing_page',
    description:
      'Browse every Sanskrit word-search and crossword puzzle, curated collections, and topics in one place.'
  };
}

export const Route = createFileRoute('/_hub/puzzles')({
  validateSearch: puzzles_search_schema,
  head: ({ match }) => routeHeadFromPageMeta(puzzlesMetaForGame(match.search.game)),
  component: PuzzlesPage
});

function PuzzlesPage() {
  const data = hubRoute.useLoaderData();
  return <HubPuzzles data={data} />;
}
