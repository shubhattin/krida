import { Effect } from 'effect';
import { protectedProcedure, t } from '~/api/trpc_init';
import { runTrpcEffect } from '~/effect/run';
import { get_user_dashboard_input_schema } from '~/api/routers/stats_query_schema';
import { combineDashboardTotals, emptyGameStats } from '~/api/routers/user/user_dashboard';
import { CACHE } from '~/util/cache.server/cache_loaders';
import type { SimpleGameKind } from '~/util/games/kinds';

const SIMPLE_DASHBOARD_KINDS = ['dvayi', 'bhramita', 'surupa', 'anveshi'] as const;

const get_dashboard_route = protectedProcedure
  .input(get_user_dashboard_input_schema)
  .query(({ input: { game }, ctx }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const userId = ctx.user.id;
        const include = (kind: typeof game) => game === 'all' || game === kind;

        const [padavali, padajala, ...simples] = yield* Effect.all([
          include('padavali')
            ? CACHE.user.padavali_dashboard.get({ userId })
            : Effect.succeed(emptyGameStats('padavali')),
          include('padajala')
            ? CACHE.user.padajala_dashboard.get({ userId })
            : Effect.succeed(emptyGameStats('padajala')),
          ...SIMPLE_DASHBOARD_KINDS.map((kind: SimpleGameKind) =>
            include(kind)
              ? CACHE.user[`${kind}_dashboard`].get({ userId })
              : Effect.succeed(emptyGameStats(kind))
          )
        ]);

        const games = [padavali, padajala, ...simples].filter((item) => {
          if (game === 'all') return true;
          return item.game === game;
        });

        return {
          totals: combineDashboardTotals(games),
          padavali,
          padajala,
          dvayi: simples[0]!,
          bhramita: simples[1]!,
          surupa: simples[2]!,
          anveshi: simples[3]!
        };
      })
    )
  );

export const user_stats_router = t.router({
  get_dashboard: get_dashboard_route
});
