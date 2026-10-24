import type { AgentKind } from '~/agents/agent_kinds';

/** Starter prompts on an empty chat. */
export const AGENT_SUGGESTIONS = {
  general: [
    'How many plays did each game get in the last 7 days?',
    'Which listed puzzles have the lowest average accuracy?',
    'List draft puzzles that have no tags yet',
    'What share of plays are by signed-in players vs guests?'
  ],
  puzzle_creator: [
    'Suggest 5 themes we have not covered yet',
    'Write a puzzle on the Daśāvatāra',
    'Write two puzzles from the Bhagavad Gītā, different angles',
    'Which existing tags fit a puzzle on Ayurvedic herbs?'
  ]
} as const satisfies Record<AgentKind, readonly string[]>;
