import { t } from './trpc_init';
import { puzzle_router } from './routers/puzzle';

export const appRouter = t.router({
  puzzle: puzzle_router
});

export type AppRouter = typeof appRouter;
