import { t } from './trpc_init';
import { padavali_router } from './routers/padavali';
import { schedules_router } from './routers/schedules';

export const appRouter = t.router({
  padavali: padavali_router,
  schedules: schedules_router
});

export type AppRouter = typeof appRouter;
