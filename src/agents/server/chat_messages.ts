import type { ModelMessage } from 'ai';

/**
 * Mark the end of the conversation as a cache breakpoint (the system prompt has the other one).
 * The next request — the next turn — then reads the whole history from cache instead of paying
 * for it again. Ignored by models that cache automatically.
 */
export function withHistoryCacheBreakpoint(messages: ModelMessage[]): ModelMessage[] {
  const last = messages.at(-1);
  if (!last) return messages;
  const marked: ModelMessage = {
    ...last,
    providerOptions: {
      ...last.providerOptions,
      openrouter: { ...last.providerOptions?.openrouter, cacheControl: { type: 'ephemeral' } }
    }
  };
  return [...messages.slice(0, -1), marked];
}
