import type { SystemModelMessage } from 'ai';
import type { GameKind } from '~/util/catalog/tags';
import type { AgentKind } from '~/agents/agent_kinds';
import { resolveCreatorOptions, type CreatorOptions } from '~/agents/creator_options';
import type { AgentContextSnapshot } from '~/agents/ui_message';
import { describeDatabaseSchema } from '~/agents/db_schema/describe_schema';
import { GENERAL_SYSTEM_PROMPT } from './general';
import { puzzleCreatorSystemPrompt } from './puzzle_creator';

export type InstructionSection = {
  id: 'system_prompt' | 'database_schema' | 'puzzle_context';
  title: string;
  content: string;
};

/**
 * Everything the agent reads before the conversation, most stable first: system prompt, then
 * the database schema, then the (frozen) puzzle context. The cache breakpoint goes after the
 * last section, so every turn of a chat reuses the whole prefix.
 */
export function agentInstructionSections(chat: {
  agent_kind: AgentKind;
  game_kind: GameKind | null;
  creator_options: CreatorOptions | null;
  context_snapshot: AgentContextSnapshot | null;
}): InstructionSection[] {
  const creatorKind = chat.agent_kind === 'puzzle_creator' ? chat.game_kind : null;
  const sections: InstructionSection[] = [
    {
      id: 'system_prompt',
      title: 'System prompt',
      content: creatorKind
        ? puzzleCreatorSystemPrompt(
            creatorKind,
            resolveCreatorOptions(creatorKind, chat.creator_options)
          )
        : GENERAL_SYSTEM_PROMPT
    },
    {
      id: 'database_schema',
      title: 'Database schema',
      content: `<database_schema>\n${describeDatabaseSchema()}\n</database_schema>`
    }
  ];
  if (creatorKind && chat.context_snapshot) {
    const snapshot = chat.context_snapshot;
    sections.push({
      id: 'puzzle_context',
      title: 'Puzzle context',
      content: `<puzzle_context game="${snapshot.game_kind}" built_at="${snapshot.built_at}">\n${snapshot.text}\n</puzzle_context>`
    });
  }
  return sections;
}

export function toSystemMessages(sections: InstructionSection[]): SystemModelMessage[] {
  const messages: SystemModelMessage[] = sections.map((section) => ({
    role: 'system',
    content: section.content
  }));
  // OpenAI caches prefixes automatically; Anthropic (via OpenRouter) needs the breakpoint.
  const last = messages.at(-1);
  if (last) last.providerOptions = { openrouter: { cacheControl: { type: 'ephemeral' } } };
  return messages;
}
