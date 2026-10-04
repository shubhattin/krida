import { createFileRoute, getRouteApi, notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import {
  routeHeadFromPageMeta,
  shareImageInfoFromAsset
} from '~/components/tags/getPageMetaTags';
import { CACHE, NO_CACHE_PARAMS } from '~/util/cache.server/cache_loaders';
import { runLoaderEffect } from '~/effect/run';
import HubCollectionPage from '~/components/hub/HubCollectionPage';

const hubRoute = getRouteApi('/_hub');

const collectionMeta$ = createServerFn({ method: 'GET' })
  .validator(z.object({ slug: z.string().min(1).max(100) }))
  .handler(async ({ data }) => {
    const collections = await runLoaderEffect(
      CACHE.catalog.listed_collections.get(NO_CACHE_PARAMS)
    );
    const collection = collections.find((row) => row.slug === data.slug);
    if (!collection) return null;
    return {
      title: collection.title,
      description: collection.description,
      image: collection.image
    };
  });

export const Route = createFileRoute('/_hub/collections/$slug')({
  loader: async ({ params }) => {
    const meta = await collectionMeta$({ data: { slug: params.slug } });
    if (!meta) throw notFound();
    return meta;
  },
  head: ({ loaderData }) =>
    routeHeadFromPageMeta({
      title: loaderData ? `${loaderData.title} | Sanskrit Games` : 'Collection | Sanskrit Games',
      project: 'landing_page',
      description: loaderData?.description || 'A curated collection of Sanskrit puzzles.',
      share_image_info: shareImageInfoFromAsset(loaderData?.image)
    }),
  component: CollectionRoute
});

function CollectionRoute() {
  const data = hubRoute.useLoaderData();
  const { slug } = Route.useParams();
  return <HubCollectionPage data={data} slug={slug} />;
}
