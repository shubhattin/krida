import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';
import { t, protectedAdminProcedure } from '../trpc_init';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY
});

export const ai_image_assets_router = t.router({
  // 
});