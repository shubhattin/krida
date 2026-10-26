import { generateText, tool, type LanguageModel } from 'ai';
import { z } from 'zod';
import { openrouterCost } from '~/agents/server/cost';
import type { WebSearchInput, WebSearchOutput } from '~/agents/ui_message';

/**
 * Web search for every agent, whatever its model: the utility model searches through OpenRouter's
 * web plugin (the provider's native search for OpenAI models) and returns a summary with sources,
 * plus what the search call cost so the chat total includes it.
 */
export function createWebSearchTool(searchModel: LanguageModel) {
  return tool<WebSearchInput, WebSearchOutput>({
    description:
      'Search the web. Returns a factual summary of what was found, with source URLs. Ask a specific question.',
    inputSchema: z.object({
      query: z.string().describe('What to look up, as a specific question or search query')
    }),
    execute: async ({ query }, { abortSignal }) => {
      const result = await generateText({
        model: searchModel,
        system:
          'Search the web and report what you find: key facts, names and dates, concisely, in Markdown. Note disagreements between sources. Do not speculate beyond the sources.',
        prompt: query,
        providerOptions: {
          openrouter: { plugins: [{ id: 'web', max_results: 6 }], reasoning: { effort: 'low' } }
        },
        abortSignal
      });
      const seen = new Set<string>();
      const sources: WebSearchOutput['sources'] = [];
      for (const source of result.sources) {
        if (source.sourceType !== 'url' || seen.has(source.url)) continue;
        seen.add(source.url);
        sources.push(source.title ? { url: source.url, title: source.title } : { url: source.url });
      }
      return { summary: result.text, sources, cost: openrouterCost(result.providerMetadata) };
    }
  });
}
