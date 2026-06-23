import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY
});

export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
