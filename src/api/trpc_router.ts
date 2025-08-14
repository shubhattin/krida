import { t } from './trpc_init';
import { puzzle_router } from './routers/puzzle';
import { schedules_router } from './routers/schedules';

export const appRouter = t.router({
  puzzle: puzzle_router,
  schedules: schedules_router
});

export type AppRouter = typeof appRouter;
