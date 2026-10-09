import { protectedAdminProcedure, t } from '~/api/trpc_init';
import { runTrpcEffect } from '~/effect/run';
import { get_admin_overview_input_schema } from '~/api/routers/stats_query_schema';
import {
  fetchAdminAnalyticsOverview,
  type AdminAnalyticsGameId
} from '~/api/routers/analytics/analytics_overview';

const overviewGames = (game: 'all' | AdminAnalyticsGameId): AdminAnalyticsGameId[] =>
  game === 'all'
    ? ['padavali', 'padajala', 'dvayi', 'bhramita', 'surupa', 'anveshi']
    : [game];

const get_overview_route = protectedAdminProcedure
  .input(get_admin_overview_input_schema)
  .query(({ input }) =>
    runTrpcEffect(
      fetchAdminAnalyticsOverview(
        {
          all_time: input.all_time,
          start_date: input.start_date,
          end_date: input.end_date
        },
        overviewGames(input.game)
      )
    )
  );

export const analytics_router = t.router({
  get_overview: get_overview_route
});

export type {
  AdminAnalyticsGameId,
  AdminAnalyticsGameRow,
  AdminAnalyticsOverview,
  AdminAnalyticsTotals
} from '~/api/routers/analytics/analytics_overview';
