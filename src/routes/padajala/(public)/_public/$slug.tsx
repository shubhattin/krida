import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { PuzzleBackLink } from '~/components/pages/puzzle/PuzzleBackLink';
import PadajalaGameRoot from '~/components/pages/padajala/PadajalaGame/PadajalaGameRoot';
import { routeHeadFromPageMeta, shareImageInfoFromAsset } from '~/components/tags/getPageMetaTags';
import { CACHE, NO_CACHE_PARAMS } from '~/util/cache.server/cache_loaders';
import type { PadajalaPuzzleType } from '~/util/cache.server/padajala_cache';
import { resolvePuzzleSlug } from '~/util/cache.server/puzzle_slug_map_cache';
import { runLoaderEffect } from '~/effect/run';

type SlugResolution =
  | { type: 'puzzle'; puzzle: PadajalaPuzzleType }
  | { type: 'redirect'; targetSlug: string }
  | { type: 'not_found' };

const resolve_puzzle_slug = async (slug: string): Promise<SlugResolution> => {
  // Degraded but serving: if the slug map is unavailable, fall back to the
  // authoritative word_puzzle lookup with no redirect fast-path.
  const slug_map = await runLoaderEffect(CACHE.slug_map.slug_map.get(NO_CACHE_PARAMS)).catch(
    () => null
  );
  const verdict = slug_map ? resolvePuzzleSlug(slug_map, 'padajala', slug) : null;
  if (verdict?.type === 'redirect') {
    return { type: 'redirect', targetSlug: verdict.targetSlug };
  }

  const word_puzzle = await runLoaderEffect(CACHE.padajala.word_puzzle.get({ slug }));
  if (word_puzzle) {
    return { type: 'puzzle', puzzle: word_puzzle };
  }

  return { type: 'not_found' };
};

const loader$ = createServerFn({ method: 'GET' })
  .validator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    const resolution = await resolve_puzzle_slug(data.slug);

    if (resolution.type === 'redirect') {
      return { kind: 'redirect' as const, targetSlug: resolution.targetSlug };
    }
    if (resolution.type === 'not_found') {
      return { kind: 'not_found' as const };
    }

    const word_puzzle = resolution.puzzle;

    const current_schedule = await runLoaderEffect(
      CACHE.padajala.current_schedule.get(NO_CACHE_PARAMS)
    );

    if (current_schedule && word_puzzle.id === current_schedule.puzzle.id) {
      return { kind: 'current_puzzle' as const };
    }

    if (!word_puzzle.listed) {
      return {
        kind: 'unavailable' as const,
        title: word_puzzle.title,
        description: word_puzzle.description,
        image: word_puzzle.image
      };
    }

    return { kind: 'puzzle' as const, word_puzzle };
  });

export const Route = createFileRoute('/padajala/(public)/_public/$slug')({
  loader: async ({ params }) => {
    const result = await loader$({ data: { slug: params.slug } });

    if (result.kind === 'redirect') {
      throw redirect({
        href: `/padajala/${encodeURIComponent(result.targetSlug)}`,
        statusCode: 301
      });
    }
    if (result.kind === 'not_found') throw notFound();
    if (result.kind === 'current_puzzle') throw redirect({ to: '/padajala' });

    return result;
  },
  head: ({ loaderData }) =>
    routeHeadFromPageMeta({
      title: loaderData
        ? `${loaderData.kind === 'puzzle' ? loaderData.word_puzzle.title : loaderData.title} - Padajala`
        : 'Not Found',
      description: loaderData
        ? loaderData.kind === 'puzzle'
          ? loaderData.word_puzzle.description
          : loaderData.description
        : null,
      project: 'padajala',
      share_image_info: shareImageInfoFromAsset(
        loaderData?.kind === 'puzzle'
          ? loaderData.word_puzzle.image
          : loaderData?.kind === 'unavailable'
            ? loaderData.image
            : null
      )
    }),
  component: PadajalaSlugPage
});

function PadajalaSlugPage() {
  const data = Route.useLoaderData();

  return (
    <main className="relative min-h-dvh overflow-x-clip">
      <PuzzleBackLink game="padajala" />
      {data.kind === 'unavailable' ? (
        <div className="px-4 py-8 text-center text-muted-foreground">
          This puzzle is not available.
        </div>
      ) : (
        <PadajalaGameRoot
          puzzle={data.word_puzzle}
          location="list_page"
          attachments={data.word_puzzle.attachments}
          image={data.word_puzzle.image}
        />
      )}
    </main>
  );
}
