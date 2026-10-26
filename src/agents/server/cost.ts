import type { ProviderMetadata, TextStreamPart, ToolSet } from 'ai';
import { z } from 'zod';
import type { AgentModelId } from '~/agents/models';
import type { AgentMessageMetadata } from '~/agents/ui_message';

const openrouter_usage_schema = z.object({
  openrouter: z.object({ usage: z.object({ cost: z.number() }) })
});

/**
 * The amount OpenRouter actually charged for one model call, in USD (its credits are dollars):
 * cache reads and writes at their real rates, not tokens × list price. 0 when not reported.
 */
export function openrouterCost(metadata: ProviderMetadata | undefined): number {
  const parsed = openrouter_usage_schema.safeParse(metadata);
  return parsed.success ? parsed.data.openrouter.usage.cost : 0;
}

type Usage = NonNullable<AgentMessageMetadata['usage']>;

const addUsage = (a: Usage | undefined, b: Usage): Usage => ({
  inputTokens: (a?.inputTokens ?? 0) + (b.inputTokens ?? 0),
  outputTokens: (a?.outputTokens ?? 0) + (b.outputTokens ?? 0),
  cachedInputTokens: (a?.cachedInputTokens ?? 0) + (b.cachedInputTokens ?? 0),
  reasoningTokens: (a?.reasoningTokens ?? 0) + (b.reasoningTokens ?? 0)
});

const searchCost = z.object({ cost: z.number() });

/**
 * Running cost and token totals of one reply, for `messageMetadata`. Totals are emitted after
 * every step, so a cancelled reply still records what it cost.
 */
export function createReplyMeter(model: AgentModelId, base: AgentMessageMetadata | undefined) {
  let cost = base?.cost ?? 0;
  let usage = base?.usage;
  return (part: TextStreamPart<ToolSet>): AgentMessageMetadata | undefined => {
    if (part.type === 'start') return { model };
    if (part.type === 'tool-result' && part.toolName === 'web_search') {
      const parsed = searchCost.safeParse(part.output);
      if (parsed.success) cost += parsed.data.cost;
      return undefined;
    }
    if (part.type === 'finish-step') {
      cost += openrouterCost(part.providerMetadata);
      usage = addUsage(usage, {
        inputTokens: part.usage.inputTokens,
        outputTokens: part.usage.outputTokens,
        cachedInputTokens: part.usage.inputTokenDetails?.cacheReadTokens,
        reasoningTokens: part.usage.outputTokenDetails?.reasoningTokens
      });
      return { model, cost, usage };
    }
    if (part.type === 'finish') return { model, cost, usage };
    return undefined;
  };
}
