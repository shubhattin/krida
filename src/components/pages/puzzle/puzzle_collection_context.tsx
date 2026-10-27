'use client';

import { createContext, useContext } from 'react';
import {
  EMPTY_PUZZLE_COLLECTION_CONTEXT,
  type PuzzleCollectionContext
} from '~/util/catalog/collection_nav';

const Ctx = createContext<PuzzleCollectionContext>(EMPTY_PUZZLE_COLLECTION_CONTEXT);

/** Set by public puzzle routes from their loader; previews and daily pages leave it empty. */
export function PuzzleCollectionProvider({
  value,
  children
}: {
  value: PuzzleCollectionContext;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const usePuzzleCollection = () => useContext(Ctx);
