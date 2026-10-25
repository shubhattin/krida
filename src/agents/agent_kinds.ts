import { z } from 'zod';
import type { AgentModelId } from './models';

export const AGENT_KINDS = ['general', 'puzzle_creator'] as const;
export type AgentKind = (typeof AGENT_KINDS)[number];
export const agent_kind_schema = z.enum(AGENT_KINDS);

export const AGENT_KIND_META = {
  general: {
    label: 'General',
    description:
      'Ask anything about the puzzles, plays and catalog. Reads the database and the web.',
    defaultModel: 'claude-sonnet-5.5'
  },
  puzzle_creator: {
    label: 'Puzzle Creator',
    description:
      'Writes new puzzles for one game, aware of every existing puzzle, tag and collection.',
    defaultModel: 'claude-sonnet-5.5'
  }
} as const satisfies Record<
  AgentKind,
  { label: string; description: string; defaultModel: AgentModelId }
>;
