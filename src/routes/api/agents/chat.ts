import { createFileRoute } from '@tanstack/react-router';
import { consumeStream, convertToModelMessages, createIdGenerator, validateUIMessages } from 'ai';
import { Effect } from 'effect';
import { z } from 'zod';
import { resolvePuzzleRefs } from '~/agents/context/build_context';
import { agent_model_id_schema } from '~/agents/models';
import {
  AGENT_DATA_SCHEMAS,
  MAX_PUZZLE_REFS,
  messagePuzzleRefs,
  puzzleRefToModelText
} from '~/agents/puzzle_refs';
import { createAgent } from '~/agents/server/create_agent';
import { withHistoryCacheBreakpoint } from '~/agents/server/chat_messages';
import {
  findAgentChat,
  loadAgentMessages,
  saveAgentMessages,
  setChatStreaming
} from '~/agents/server/chat_store';
import { generateChatTitle } from '~/agents/server/chat_title';
import { createReplyMeter } from '~/agents/server/cost';
import type { AgentUIMessage } from '~/agents/ui_message';
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

/**
 * Fill the new message's `@` mentions from the database (never trusting client-sent content),
 * placed before the text so each puzzle sits right above what the admin wrote about it.
 */
const attachPuzzleRefs = Effect.fn('agents.attach_puzzle_refs')(function* (
  message: AgentUIMessage
) {
  const refs = messagePuzzleRefs(message).slice(0, MAX_PUZZLE_REFS);
  const resolved = refs.length > 0 ? yield* resolvePuzzleRefs(refs) : [];
  return {
    ...message,
    parts: [
      ...resolved.map((data) => ({ type: 'data-puzzle_ref' as const, data })),
      ...message.parts.filter((part) => part.type !== 'data-puzzle_ref')
    ]
  } satisfies AgentUIMessage;
});

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

      const validated = yield* Effect.tryPromise({
        try: () =>
          validateUIMessages<AgentUIMessage>({
            messages: [...history, parsed.data.message],
            tools,
            dataSchemas: AGENT_DATA_SCHEMAS
          }),
        catch: () => BadRequestError.make({ message: 'Invalid message' })
      });
      const messages = [...validated.slice(0, -1), yield* attachPuzzleRefs(validated.at(-1)!)];

      // Title the chat in parallel with the first reply.
      const newMessage = messages.at(-1)!;
      const titlePromise =
        !chat.title && history.length === 0
          ? appRuntime.runPromise(generateChatTitle(firstText(newMessage)))
          : null;

      const meter = createReplyMeter(model, undefined);

      yield* setChatStreaming(id, true);
      const result = yield* Effect.promise(async () =>
        agent.stream({
          prompt: withHistoryCacheBreakpoint(
            await convertToModelMessages<AgentUIMessage>(messages, {
              tools,
              convertDataPart: puzzleRefToModelText
            })
          )
        })
      ).pipe(Effect.onError(() => Effect.ignore(setChatStreaming(id, false))));

      return result.toUIMessageStreamResponse<AgentUIMessage>({
        originalMessages: messages,
        generateMessageId,
        // Keep generating (and saving) even if the admin closes the tab mid-reply.
        consumeSseStream: consumeStream,
        // Actual cost and tokens, emitted after every step.
        messageMetadata: ({ part }) => meter(part),
        onFinish: async ({ messages: finished }) => {
          try {
            const title = titlePromise ? await titlePromise : undefined;
            await appRuntime.runPromise(
              saveAgentMessages({ chatId: id, messages: finished, model, title })
            );
          } finally {
            await appRuntime.runPromise(setChatStreaming(id, false));
          }
        },
        onError: (error) => {
          void appRuntime.runPromise(setChatStreaming(id, false));
          return error instanceof Error ? error.message : 'The agent failed to reply.';
        }
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
