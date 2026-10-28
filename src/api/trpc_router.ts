import { t } from './trpc_init';
import { puzzle_router, schedules_router } from './routers/padavali';
import {
  admin_ai_content_router,
  ai_image_assets_router,
  batch_ai_router,
  image_assets_router,
  public_ai_router,
  system_prompts_router
} from './routers/ai';
import { padajala_router } from './routers/padajala';
import { dvayi_router } from './routers/dvayi';
import { bhramita_router } from './routers/bhramita';
import { surupa_router } from './routers/surupa';
import { anveshi_router } from './routers/anveshi';
import { user_stats_router } from './routers/user';
import { catalog_router } from './routers/catalog';
import { analytics_router } from './routers/analytics';
import { agents_router } from './routers/agents';

export const appRouter = t.router({
  puzzle: puzzle_router,
  padajala: padajala_router,
  dvayi: dvayi_router,
  bhramita: bhramita_router,
  surupa: surupa_router,
  anveshi: anveshi_router,
  user: user_stats_router,
  schedules: schedules_router,
  ai_image_gen: ai_image_assets_router,
  image_assets: image_assets_router,
  system_prompts: system_prompts_router,
  public_ai: public_ai_router,
  admin_ai_content: admin_ai_content_router,
  batch_ai: batch_ai_router,
  catalog: catalog_router,
  analytics: analytics_router,
  agents: agents_router
});

export type AppRouter = typeof appRouter;
