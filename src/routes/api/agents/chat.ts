import { createFileRoute } from '@tanstack/react-router';
import { consumeStream, convertToModelMessages, createIdGenerator, validateUIMessages } from 'ai';
import { Effect } from 'effect';
import { z } from 'zod';
import { agent_model_id_schema } from '~/agents/models';
import { createAgent } from '~/agents/server/create_agent';
import { findAgentChat, loadAgentMessages, saveAgentMessages } from '~/agents/server/chat_store';
import { generateChatTitle } from '~/agents/server/chat_title';
import type { AgentMessageMetadata, AgentUIMessage } from '~/agents/ui_message';
import { BadRequestError } from '~/effect/errors';
import { runRouteEffect } from '~/effect/run';
import { appRuntime } from '~/effect/runtime';
import { getServerUserSession$ } from '~/lib/get_auth_from_cookie';
import { isSameOriginRequest } from '~/lib/same_origin';

const body_schema = z.object({
  id: z.string().min(1).max(64),
  /** Only the new user message; history is loaded from the database. */
  message: z.object({ id: z.string().min(1), role: z.literal('user') }).passthrough(),
  model: agent_model_id_schema
});

const generateMessageId = createIdGenerator({ prefix: 'msg', size: 16 });

const firstText = (message: AgentUIMessage) =>
  message.parts
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join(' ')
    .trim();

async function handleChat(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request, import.meta.env.VITE_SITE_URL)) {
    return new Response('Cross-site request rejected', { status: 403 });
  }
  const session = await getServerUserSession$();
  if (session?.user?.role !== 'admin') return new Response('Forbidden', { status: 403 });

  const parsed = body_schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 });
  const { id, model } = parsed.data;

  return runRouteEffect(
    Effect.gen(function* () {
      const chat = yield* findAgentChat(id);
      const previous = yield* loadAgentMessages(id);
      const { agent, tools } = yield* createAgent({ ...chat, model });

      // A retry resends a message that may already be stored: replay history up to it.
      const resent = previous.findIndex((message) => message.id === parsed.data.message.id);
      const history = resent === -1 ? previous : previous.slice(0, resent);

      const messages = yield* Effect.tryPromise({
        try: () =>
          validateUIMessages<AgentUIMessage>({
            messages: [...history, parsed.data.message],
            tools
          }),
        catch: () => BadRequestError.make({ message: 'Invalid message' })
      });

      // Title the chat in parallel with the first reply.
      const newMessage = messages.at(-1)!;
      const titlePromise =
        !chat.title && history.length === 0
          ? appRuntime.runPromise(generateChatTitle(firstText(newMessage)))
          : null;

      const result = yield* Effect.promise(async () =>
        agent.stream({ prompt: await convertToModelMessages(messages, { tools }) })
      );

      return result.toUIMessageStreamResponse<AgentUIMessage>({
        originalMessages: messages,
        generateMessageId,
        // Keep generating (and saving) even if the admin closes the tab mid-reply.
        consumeSseStream: consumeStream,
        messageMetadata: ({ part }): AgentMessageMetadata | undefined => {
          if (part.type === 'start') return { model };
          if (part.type === 'finish') {
            return {
              model,
              usage: {
                inputTokens: part.totalUsage.inputTokens,
                outputTokens: part.totalUsage.outputTokens,
                cachedInputTokens: part.totalUsage.inputTokenDetails?.cacheReadTokens,
                reasoningTokens: part.totalUsage.outputTokenDetails?.reasoningTokens
              }
            };
          }
          return undefined;
        },
        onFinish: async ({ messages: finished }) => {
          const title = titlePromise ? await titlePromise : undefined;
          await appRuntime.runPromise(
            saveAgentMessages({ chatId: id, messages: finished, model, title })
          );
        },
        onError: (error) => (error instanceof Error ? error.message : 'The agent failed to reply.')
      });
    }),
    { onSuccess: (response) => response }
  );
}

export const Route = createFileRoute('/api/agents/chat')({
  server: {
    handlers: {
      POST: ({ request }) => handleChat(request)
    }
  }
});
