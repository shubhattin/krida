import { t } from './trpc_init';
import { puzzle_router, schedules_router } from './routers/padavali';
import {
  ai_image_assets_router,
  batch_ai_router,
  image_assets_router,
  public_ai_router
} from './routers/ai';
import { crossword_router } from './routers/crossword';
import { user_stats_router } from './routers/user';

export const appRouter = t.router({
  puzzle: puzzle_router,
  crossword: crossword_router,
  user: user_stats_router,
  schedules: schedules_router,
  ai_image_gen: ai_image_assets_router,
  image_assets: image_assets_router,
  public_ai: public_ai_router,
  batch_ai: batch_ai_router
});

export type AppRouter = typeof appRouter;
