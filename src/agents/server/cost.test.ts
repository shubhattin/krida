import type { TextStreamPart, ToolSet } from 'ai';
import { describe, expect, it } from 'vitest';
import { createReplyMeter, openrouterCost } from './cost';

// SAFETY: test stream parts carry only the fields the meter reads.
const part = (value: Record<string, unknown>) => value as unknown as TextStreamPart<ToolSet>;

const step = (cost: number, input: number, cached: number, output: number) =>
  part({
    type: 'finish-step',
    providerMetadata: { openrouter: { usage: { cost } } },
    usage: {
      inputTokens: input,
      outputTokens: output,
      inputTokenDetails: { cacheReadTokens: cached },
      outputTokenDetails: { reasoningTokens: 0 }
    }
  });

describe('openrouterCost', () => {
  it('reads the charged cost and ignores anything else', () => {
    expect(openrouterCost({ openrouter: { usage: { cost: 0.0123 } } })).toBe(0.0123);
    expect(openrouterCost({ openai: { responseId: 'x' } })).toBe(0);
    expect(openrouterCost(undefined)).toBe(0);
  });
});

describe('createReplyMeter', () => {
  it('adds up steps and web searches', () => {
    const meter = createReplyMeter('gpt-6-luna', undefined);
    expect(meter(part({ type: 'start' }))).toEqual({ model: 'gpt-6-luna' });
    meter(step(0.01, 1000, 800, 50));
    meter(
      part({
        type: 'tool-result',
        toolName: 'web_search',
        output: { summary: '', sources: [], cost: 0.02 }
      })
    );
    const last = meter(step(0.005, 1200, 1000, 80));
    expect(last?.cost).toBeCloseTo(0.035);
    expect(last?.usage).toMatchObject({
      inputTokens: 2200,
      cachedInputTokens: 1800,
      outputTokens: 130
    });
  });

  it('continues from what a resumed reply already counted', () => {
    const meter = createReplyMeter('claude-opus-5.5', {
      model: 'claude-opus-5.5',
      cost: 0.1,
      usage: { inputTokens: 5000, outputTokens: 400, cachedInputTokens: 4000, reasoningTokens: 100 }
    });
    const result = meter(step(0.02, 6000, 5500, 300));
    expect(result?.cost).toBeCloseTo(0.12);
    expect(result?.usage).toMatchObject({
      inputTokens: 11000,
      cachedInputTokens: 9500,
      outputTokens: 700,
      reasoningTokens: 100
    });
  });
});
