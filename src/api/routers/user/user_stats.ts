import { Effect } from 'effect';
import { protectedProcedure, t } from '~/api/trpc_init';
import { runTrpcEffect } from '~/effect/run';
import { get_user_dashboard_input_schema } from '~/api/routers/stats_query_schema';
import { combineDashboardTotals, emptyGameStats } from '~/api/routers/user/user_dashboard';
import { CACHE } from '~/util/cache.server/cache_loaders';

const get_dashboard_route = protectedProcedure
  .input(get_user_dashboard_input_schema)
  .query(({ input: { game }, ctx }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const userId = ctx.user.id;
        const includePadavali = game === 'all' || game === 'padavali';
        const includePadajala = game === 'all' || game === 'padajala';

        const [padavali, padajala] = yield* Effect.all([
          includePadavali
            ? CACHE.user.padavali_dashboard.get({ userId })
            : Effect.succeed(emptyGameStats('padavali')),
          includePadajala
            ? CACHE.user.padajala_dashboard.get({ userId })
            : Effect.succeed(emptyGameStats('padajala'))
        ]);

        const games = [padavali, padajala].filter((item) => {
          if (game === 'all') return true;
          return item.game === game;
        });

        return {
          totals: combineDashboardTotals(games),
          padavali,
          padajala
        };
      })
    )
  );

export const user_stats_router = t.router({
  get_dashboard: get_dashboard_route
});
