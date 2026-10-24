import { Effect } from 'effect';
import { z } from 'zod';
import { protectedAdminProcedure, t } from '~/api/trpc_init';
import { runTrpcEffect } from '~/effect/run';
import { BadRequestError } from '~/effect/errors';
import { game_kind_schema } from '~/util/catalog/tags';
import { agent_kind_schema } from '~/agents/agent_kinds';
import { creator_options_schema } from '~/agents/creator_options';
import { agent_model_id_schema } from '~/agents/models';
import { agentInstructionSections } from '~/agents/prompts/instructions';
import { addProposedPuzzle, findProposedDraft } from '~/agents/server/add_puzzle';
import {
  createAgentChat,
  deleteAgentChat,
  findAgentChat,
  listAgentChats,
  loadAddedPuzzles,
  loadAgentMessages,
  refreshAgentContext,
  renameAgentChat
} from '~/agents/server/chat_store';
import { checkDraftWithDatabase } from '~/agents/server/draft_checks';

const chat_id_schema = z.string().min(1).max(64);

const list_chats_route = protectedAdminProcedure.query(() => runTrpcEffect(listAgentChats()));

const get_chat_route = protectedAdminProcedure
  .input(z.object({ id: chat_id_schema }))
  .query(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const chat = yield* findAgentChat(input.id);
        const [messages, added_puzzles] = yield* Effect.all(
          [loadAgentMessages(input.id), loadAddedPuzzles(input.id)],
          { concurrency: 'unbounded' }
        );
        const { context_snapshot, ...rest } = chat;
        return {
          chat: {
            ...rest,
            context: context_snapshot
              ? { built_at: context_snapshot.built_at, counts: context_snapshot.counts }
              : null
          },
          messages,
          added_puzzles
        };
      })
    )
  );

const create_chat_route = protectedAdminProcedure
  .input(
    z.object({
      id: chat_id_schema,
      agent_kind: agent_kind_schema,
      game_kind: game_kind_schema.nullable(),
      model: agent_model_id_schema,
      creator_options: creator_options_schema.partial().nullish()
    })
  )
  .mutation(({ input, ctx }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        if (input.agent_kind === 'puzzle_creator' && !input.game_kind) {
          return yield* Effect.fail(
            BadRequestError.make({ message: 'Pick a game for the Puzzle Creator' })
          );
        }
        return yield* createAgentChat({ ...input, user_id: ctx.user.id });
      })
    )
  );

const rename_chat_route = protectedAdminProcedure
  .input(z.object({ id: chat_id_schema, title: z.string().trim().min(1).max(120) }))
  .mutation(({ input }) => runTrpcEffect(renameAgentChat(input.id, input.title)));

const delete_chat_route = protectedAdminProcedure
  .input(z.object({ id: chat_id_schema }))
  .mutation(({ input }) => runTrpcEffect(deleteAgentChat(input.id)));

/** Everything the agent reads before the conversation, for the Context dialog. */
const get_context_route = protectedAdminProcedure
  .input(z.object({ id: chat_id_schema }))
  .query(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const chat = yield* findAgentChat(input.id);
        return {
          snapshot: chat.context_snapshot
            ? { built_at: chat.context_snapshot.built_at, counts: chat.context_snapshot.counts }
            : null,
          sections: agentInstructionSections(chat)
        };
      })
    )
  );

const refresh_context_route = protectedAdminProcedure
  .input(z.object({ id: chat_id_schema }))
  .mutation(({ input }) => runTrpcEffect(refreshAgentContext(input.id)));

/** Re-check a proposal (optionally under another slug) right before adding it. */
const check_proposal_route = protectedAdminProcedure
  .input(
    z.object({
      chat_id: chat_id_schema,
      tool_call_id: z.string().min(1),
      slug: z.string().optional()
    })
  )
  .query(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const { proposal, creator_options } = yield* findProposedDraft(
          input.chat_id,
          input.tool_call_id
        );
        return yield* checkDraftWithDatabase(proposal, {
          slugOverride: input.slug,
          creator_options
        });
      })
    )
  );

const add_puzzle_route = protectedAdminProcedure
  .input(
    z.object({
      chat_id: chat_id_schema,
      tool_call_id: z.string().min(1),
      slug: z.string().optional()
    })
  )
  .mutation(({ input }) =>
    runTrpcEffect(
      addProposedPuzzle({ chatId: input.chat_id, toolCallId: input.tool_call_id, slug: input.slug })
    )
  );

export const agents_router = t.router({
  list_chats: list_chats_route,
  get_chat: get_chat_route,
  create_chat: create_chat_route,
  rename_chat: rename_chat_route,
  delete_chat: delete_chat_route,
  get_context: get_context_route,
  refresh_context: refresh_context_route,
  check_proposal: check_proposal_route,
  add_puzzle: add_puzzle_route
});
