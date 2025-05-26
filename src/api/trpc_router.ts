import { t } from './trpc_init';
import { padavali_router } from './routers/padavali';

export const appRouter = t.router({
  padavali: padavali_router
});

export type AppRouter = typeof appRouter;
