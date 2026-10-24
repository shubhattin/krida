import { Effect } from 'effect';
import { generateText } from 'ai';
import { AGENT_UTILITY_MODEL } from '~/agents/models';
import { resolveAgentModel } from './create_agent';

const MAX_TITLE_LENGTH = 80;

const fallbackTitle = (text: string) => {
  const line = text.trim().split('\n')[0] ?? '';
  return line.length > 50 ? `${line.slice(0, 50).trimEnd()}…` : line || 'New chat';
};

/** A short sidebar title from the first message, by the utility model with reasoning off. */
export const generateChatTitle = Effect.fn('agents.generate_chat_title')(function* (
  firstMessage: string
) {
  const model = yield* resolveAgentModel(AGENT_UTILITY_MODEL);
  return yield* Effect.tryPromise(async () => {
    const { text } = await generateText({
      model,
      system:
        'Write a 2–6 word title for a chat that starts with the message below. Title case, no quotes, no trailing period. Keep Sanskrit words as written.',
      prompt: firstMessage.slice(0, 2_000),
      providerOptions: { openai: { reasoningEffort: 'none' } },
      abortSignal: AbortSignal.timeout(20_000)
    });
    const title = text.trim().replace(/^["'“]|["'”.]$/g, '');
    return title ? title.slice(0, MAX_TITLE_LENGTH) : fallbackTitle(firstMessage);
  }).pipe(Effect.catch(() => Effect.succeed(fallbackTitle(firstMessage))));
});
