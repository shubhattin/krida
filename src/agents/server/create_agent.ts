import { Effect } from 'effect';
import { stepCountIs, ToolLoopAgent, type Tool } from 'ai';
import { AiProvider } from '~/effect/ai';
import type { GameKind } from '~/util/catalog/tags';
import type { AgentKind } from '~/agents/agent_kinds';
import { AGENT_MODELS, AGENT_UTILITY_MODEL, type AgentModelId } from '~/agents/models';
import { agentInstructionSections, toSystemMessages } from '~/agents/prompts/instructions';
import { createProposePuzzleTool } from '~/agents/tools/propose_puzzle';
import { sqlQueryTool } from '~/agents/tools/sql_query';
import { createWebSearchTool } from '~/agents/tools/web_search';
import type { CreatorOptions } from '~/agents/creator_options';
import type { AgentContextSnapshot, AgentUITools } from '~/agents/ui_message';

/** The tools as the UI message type knows them; `propose_puzzle` only for the creator. */
export type AgentTools = {
  [Name in keyof AgentUITools]?: Tool<AgentUITools[Name]['input'], AgentUITools[Name]['output']>;
};

/** Tool calls + replies per user turn; propose → fix → propose loops need headroom. */
const MAX_STEPS = 30;

export const resolveAgentModel = Effect.fn('agents.resolve_model')(function* (
  modelId: AgentModelId
) {
  const ai = yield* AiProvider;
  const meta = AGENT_MODELS[modelId];
  return meta.provider === 'openai'
    ? ai.openaiModel(meta.providerModelId)
    : ai.openrouterModel(meta.providerModelId);
});

export const createAgent = Effect.fn('agents.create_agent')(function* (chat: {
  agent_kind: AgentKind;
  game_kind: GameKind | null;
  model: AgentModelId;
  creator_options: CreatorOptions | null;
  context_snapshot: AgentContextSnapshot | null;
}) {
  const model = yield* resolveAgentModel(chat.model);
  const searchModel = yield* resolveAgentModel(AGENT_UTILITY_MODEL);

  const tools: AgentTools = {
    sql_query: sqlQueryTool,
    web_search: createWebSearchTool(searchModel)
  };
  if (chat.agent_kind === 'puzzle_creator' && chat.game_kind) {
    tools.propose_puzzle = createProposePuzzleTool(chat.game_kind);
  }

  const agent = new ToolLoopAgent({
    model,
    instructions: toSystemMessages(agentInstructionSections(chat)),
    tools,
    stopWhen: stepCountIs(MAX_STEPS),
    providerOptions: {
      openai: { reasoningEffort: 'medium', reasoningSummary: 'auto' },
      openrouter: { reasoning: { effort: 'medium' } }
    }
  });
  return { agent, tools };
});
