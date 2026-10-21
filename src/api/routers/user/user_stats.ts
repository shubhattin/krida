import { Effect } from 'effect';
import { protectedProcedure, t } from '~/api/trpc_init';
import { runTrpcEffect } from '~/effect/run';
import { get_user_dashboard_input_schema } from '~/api/routers/stats_query_schema';
import { combineDashboardTotals, emptyGameStats } from '~/api/routers/user/user_dashboard';
import { CACHE } from '~/util/cache.server/cache_loaders';
import type { GameKind } from '~/util/catalog/tags';

const get_dashboard_route = protectedProcedure
  .input(get_user_dashboard_input_schema)
  .query(({ input: { game }, ctx }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const userId = ctx.user.id;
        // Unselected games skip the cache read and report zeroes.
        const load = (kind: GameKind) =>
          game === 'all' || game === kind
            ? CACHE.user[`${kind}_dashboard`].get({ userId })
            : Effect.succeed(emptyGameStats(kind));

        const stats = yield* Effect.all(
          {
            padavali: load('padavali'),
            padajala: load('padajala'),
            dvayi: load('dvayi'),
            bhramita: load('bhramita'),
            surupa: load('surupa'),
            anveshi: load('anveshi')
          },
          { concurrency: 'unbounded' }
        );
        const included = Object.values(stats).filter(
          (item) => game === 'all' || item.game === game
        );

        return { totals: combineDashboardTotals(included), ...stats };
      })
    )
  );

export const user_stats_router = t.router({
  get_dashboard: get_dashboard_route
});
