import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import ms from 'ms';
import type { ScriptType } from '~/state/script_list';
import { hubData$ } from './hub_data';

/**
 * Listed puzzles only change when an admin lists one, so hub navigations, link-hover preloads
 * and `/puzzles` filter changes reuse the cached data instead of calling `hubData$` again.
 */
const HUB_DATA_STALE_TIME = ms('5mins');

/** Keyed by script: the server pre-transliterates titles into the selected one. */
export const hubDataQueryOptions = (script: ScriptType) =>
  queryOptions({
    queryKey: ['hub_data', script],
    queryFn: () => hubData$({ data: { script } }),
    staleTime: HUB_DATA_STALE_TIME
  });

const hubRoute = getRouteApi('/_hub');

/** Hub data for the `/_hub` pages; the layout loader has already put it in the query cache. */
export function useHubData() {
  const { script } = hubRoute.useLoaderData();
  return useSuspenseQuery(hubDataQueryOptions(script)).data;
}
