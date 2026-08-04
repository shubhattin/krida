import { Context, Effect, Layer, Redacted, Schedule } from 'effect';
import OpenAI from 'openai';
import { createOpenAI, type OpenAIImageModelGenerationOptions } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateImage, generateText, Output, type LanguageModel } from 'ai';
import type { ZodType } from 'zod';
import { AppConfig } from './config';
import { AiProviderError } from './errors';

const tryAi = <A>(operation: string, provider: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => AiProviderError.make({ operation, provider, cause })
  }).pipe(Effect.annotateLogs({ category: 'ai', operation, provider }));

/** Retry transient AI failures (network/rate-limit). Fixed attempts; no schema-invalid retries at this layer.
 *  `Schedule.recurs(2)` → 1 initial attempt + 2 retries = 3 total tries. */
export const aiRetryPolicy = Schedule.recurs(2);

export class AiProvider extends Context.Service<
  AiProvider,
  {
    readonly openrouterModel: (modelId: string) => LanguageModel;
    readonly generateObject: <T>(input: {
      operation: string;
      provider: 'openrouter' | 'openai';
      model: LanguageModel;
      system: string;
      prompt: string;
      schema: ZodType<T>;
      openrouterReasoningEffort?: 'low' | 'medium' | 'high';
    }) => Effect.Effect<T, AiProviderError>;
    readonly generateImageBase64: (input: {
      prompt: string;
      modelId: string;
      size: `${number}x${number}`;
      quality?: 'low' | 'medium' | 'high';
    }) => Effect.Effect<string, AiProviderError>;
    readonly openaiSdk: OpenAI;
  }
>()('AiProvider') {
  static readonly Live = Layer.effect(AiProvider)(
    Effect.gen(function* () {
      const config = yield* AppConfig;
      const openaiKey = Redacted.value(config.openaiApiKey);
      const openrouterKey = Redacted.value(config.openrouterApiKey);
      const openaiSdk = new OpenAI({ apiKey: openaiKey });
      const openai = createOpenAI({ apiKey: openaiKey });
      const openrouter = createOpenRouter({ apiKey: openrouterKey });

      return {
        openrouterModel: (modelId: string) => openrouter(modelId),
        openaiSdk,
        generateObject: <T>(input: {
          operation: string;
          provider: 'openrouter' | 'openai';
          model: LanguageModel;
          system: string;
          prompt: string;
          schema: ZodType<T>;
          openrouterReasoningEffort?: 'low' | 'medium' | 'high';
        }) =>
          tryAi(input.operation, input.provider, async () => {
            const response = input.openrouterReasoningEffort
              ? await generateText({
                  model: input.model,
                  system: input.system,
                  prompt: input.prompt,
                  output: Output.object({ schema: input.schema }),
                  providerOptions: {
                    openrouter: {
                      reasoning: { effort: input.openrouterReasoningEffort }
                    }
                  }
                })
              : await generateText({
                  model: input.model,
                  system: input.system,
                  prompt: input.prompt,
                  output: Output.object({ schema: input.schema })
                });
            if (!response.output) {
              throw new Error(`Empty AI output for operation: ${input.operation}`);
            }
            return response.output;
          }).pipe(Effect.retry(aiRetryPolicy)),

        generateImageBase64: (input) =>
          tryAi('generateImage', 'openai', async () => {
            const generated = await generateImage({
              model: openai.image(input.modelId),
              prompt: input.prompt,
              size: input.size,
              providerOptions: {
                openai: {
                  quality: input.quality ?? 'medium'
                } satisfies OpenAIImageModelGenerationOptions
              }
            });
            return generated.image.base64;
          }).pipe(Effect.retry(aiRetryPolicy))
      };
    })
  );
}

export class OpenAiBatchClient extends Context.Service<
  OpenAiBatchClient,
  {
    readonly client: OpenAI;
  }
>()('OpenAiBatchClient') {
  static readonly Live = Layer.effect(OpenAiBatchClient)(
    Effect.gen(function* () {
      const config = yield* AppConfig;
      const client = new OpenAI({ apiKey: Redacted.value(config.openaiApiKey) });
      return { client };
    })
  );
}
