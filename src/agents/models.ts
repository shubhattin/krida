import { z } from 'zod';

/**
 * Models the admin agents can run, all through OpenRouter: one provider, and every reply reports
 * the actual cost charged (cache discounts included), which the chat adds up.
 */
export const AGENT_MODEL_IDS = [
  'gpt-6-luna',
  'gpt-6.1-sol',
  'claude-sonnet-5.5',
  'claude-opus-5.5'
] as const;

export type AgentModelId = (typeof AGENT_MODEL_IDS)[number];

export const AGENT_MODELS = {
  'gpt-6-luna': {
    label: 'GPT-6 Luna',
    hint: 'Fast and cheap — everyday questions',
    providerModelId: 'openai/gpt-6-luna'
  },
  'gpt-6.1-sol': {
    label: 'GPT-6.1 Sol',
    hint: 'Stronger reasoning — creation tasks',
    providerModelId: 'openai/gpt-6.1-sol'
  },
  'claude-sonnet-5.5': {
    label: 'Claude Sonnet 5.5',
    hint: 'Fast writer — creation default',
    providerModelId: 'anthropic/claude-sonnet-5.5'
  },
  'claude-opus-5.5': {
    label: 'Claude Opus 5.5',
    hint: 'Best writer — heavier creation tasks',
    providerModelId: 'anthropic/claude-opus-5.5'
  }
} as const satisfies Record<AgentModelId, { label: string; hint: string; providerModelId: string }>;

export const agent_model_id_schema = z.enum(AGENT_MODEL_IDS);

/** Cheap model for chores: thread titles, web search summaries. */
export const AGENT_UTILITY_MODEL = 'gpt-6-luna' satisfies AgentModelId;
