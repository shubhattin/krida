import { t } from './trpc_init';
import { puzzle_router } from './routers/puzzle';
import { schedules_router } from './routers/schedules';
import { ai_image_assets_router } from './routers/ai_image_assets';

export const appRouter = t.router({
  puzzle: puzzle_router,
  schedules: schedules_router,
  ai_image: ai_image_assets_router
});

export type AppRouter = typeof appRouter;
