import { atom } from 'jotai';

/**
 * Collection currently viewed on a public `/collections/$slug` page, so the
 * admin menu can offer an "Edit collection" shortcut. Null everywhere else.
 * Mirrors the active-puzzle atoms used for per-game "Edit #id" links.
 */
export const active_collection_atom = atom<{ uid: string; title: string } | null>(null);
