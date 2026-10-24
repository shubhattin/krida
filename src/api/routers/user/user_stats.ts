import { Effect } from 'effect';
import { z } from 'zod';
import { and, eq, exists, gte, inArray, isNull, or, sql } from 'drizzle-orm';
import { protectedProcedure, t } from '~/api/trpc_init';
import { runTrpcEffect } from '~/effect/run';
import { dbRunHttp } from '~/effect/database';
import { attempt_gameplay_stats, padajala_gameplay_stats, puzzle_sessions } from '~/db/schema';
import {
  GUEST_CLAIM_WINDOW_MS,
  MAX_GUEST_CLAIMS,
  verifyGuestClaimToken
} from '~/api/routers/guest_claim_token';
import { get_user_dashboard_input_schema } from '~/api/routers/stats_query_schema';
import { combineDashboardTotals, emptyGameStats } from '~/api/routers/user/user_dashboard';
import {
  CACHE,
  invalidate_and_refresh_cache,
  NO_CACHE_PARAMS
} from '~/util/cache.server/cache_loaders';
import { getCachedMany } from '~/effect/cache';
import type { GameKind } from '~/util/catalog/tags';
import { visibleGamesFromCounts } from '~/util/games/visibility';

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

        const [stats, listed] = yield* Effect.all(
          [
            Effect.all(
              {
                padavali: load('padavali'),
                padajala: load('padajala'),
                dvayi: load('dvayi'),
                bhramita: load('bhramita'),
                surupa: load('surupa'),
                anveshi: load('anveshi')
              },
              { concurrency: 'unbounded' }
            ),
            // Same release gate as the hub: new kridas show only once they have a listed
            // puzzle. Padāvalī and Padajāla are always visible, so only these are read (one MGET).
            getCachedMany({
              dvayi: CACHE.dvayi.listed_puzzle_list.read(NO_CACHE_PARAMS),
              bhramita: CACHE.bhramita.listed_puzzle_list.read(NO_CACHE_PARAMS),
              surupa: CACHE.surupa.listed_puzzle_list.read(NO_CACHE_PARAMS),
              anveshi: CACHE.anveshi.listed_puzzle_list.read(NO_CACHE_PARAMS)
            })
          ],
          { concurrency: 'unbounded' }
        );
        const visible_games = visibleGamesFromCounts({
          padavali: 0,
          padajala: 0,
          dvayi: listed.dvayi.length,
          bhramita: listed.bhramita.length,
          surupa: listed.surupa.length,
          anveshi: listed.anveshi.length
        });
        const included = Object.values(stats).filter(
          (item) => visible_games.includes(item.game) && (game === 'all' || item.game === game)
        );

        return { totals: combineDashboardTotals(included), visible_games, ...stats };
      })
    )
  );

/**
 * Attach finished guest plays from this device to the signed-in caller. Each token is the
 * server-signed proof `submit_stats` handed the guest; plays that are already owned, older
 * than the claim window, or never finished are skipped.
 */
const claim_guest_sessions_route = protectedProcedure
  .input(
    z.object({
      tokens: z.array(z.string().min(1).max(1024)).max(MAX_GUEST_CLAIMS)
    })
  )
  .mutation(({ input: { tokens }, ctx }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const userId = ctx.user.id;
        const verified = yield* Effect.forEach(tokens, verifyGuestClaimToken, {
          concurrency: 'unbounded'
        });
        const kindBySession = new Map(
          verified.flatMap((claim) => (claim ? [[claim.sessionId, claim.kind] as const] : []))
        );
        if (kindBySession.size === 0) return { claimed: 0 };

        const claimed = yield* dbRunHttp('user_stats.claim_guest_sessions', (client) => {
          const finished = or(
            exists(
              client
                .select({ one: sql`1` })
                .from(attempt_gameplay_stats)
                .where(eq(attempt_gameplay_stats.session_id, puzzle_sessions.id))
            ),
            exists(
              client
                .select({ one: sql`1` })
                .from(padajala_gameplay_stats)
                .where(eq(padajala_gameplay_stats.session_id, puzzle_sessions.id))
            )
          );
          return client
            .update(puzzle_sessions)
            .set({ user_id: userId })
            .where(
              and(
                inArray(puzzle_sessions.id, [...kindBySession.keys()]),
                isNull(puzzle_sessions.user_id),
                gte(puzzle_sessions.created_at, new Date(Date.now() - GUEST_CLAIM_WINDOW_MS)),
                finished
              )
            )
            .returning();
        });

        const kinds = new Set(claimed.flatMap((row) => kindBySession.get(row.id) ?? []));
        yield* Effect.forEach(
          kinds,
          (kind) =>
            invalidate_and_refresh_cache(CACHE.user[`${kind}_dashboard`], { userId }).pipe(
              Effect.catch(() => Effect.void)
            ),
          { concurrency: 'unbounded', discard: true }
        );

        return { claimed: claimed.length };
      })
    )
  );

export const user_stats_router = t.router({
  get_dashboard: get_dashboard_route,
  claim_guest_sessions: claim_guest_sessions_route
});
