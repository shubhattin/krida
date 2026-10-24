import { createContext, useContext } from 'react';
import type { GameKind } from '~/util/catalog/tags';

export type AddedPuzzle = {
  tool_call_id: string;
  puzzle_id: number | null;
  kind: GameKind | null;
  slug: string | null;
  title: string | null;
};

type AgentChatContextValue = {
  chatId: string;
  gameKind: GameKind | null;
  /** Proposals already added, by tool call id. */
  added: Map<string, AddedPuzzle>;
};

const AgentChatContext = createContext<AgentChatContextValue | null>(null);

export const AgentChatProvider = AgentChatContext.Provider;

export function useAgentChat() {
  const value = useContext(AgentChatContext);
  if (!value) throw new Error('useAgentChat must be used inside AgentChatProvider');
  return value;
}

export const puzzleEditorHref = (kind: GameKind, id: number) => `/${kind}/edit/${id}`;
