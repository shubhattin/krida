import { useSyncExternalStore } from 'react';
import { HUB_GAMES } from './hub_games';
import type { ListedCollectionsType } from '~/util/cache.server/collection_cache';

export const SIDEBAR_STORAGE_KEY = 'sanskrit-games-sidebar';

const sidebarListeners = new Set<() => void>();

function emitSidebarChange() {
  for (const listener of sidebarListeners) listener();
}

export function readSidebarOpen(): boolean | null {
  try {
    const value = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (value === 'collapsed') return false;
    if (value === 'expanded') return true;
  } catch {
    // private mode / disabled storage
  }
  return null;
}

export function writeSidebarOpen(open: boolean) {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, open ? 'expanded' : 'collapsed');
  } catch {
    // private mode / disabled storage
  }
  emitSidebarChange();
}

function subscribeSidebar(onChange: () => void) {
  sidebarListeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === SIDEBAR_STORAGE_KEY) onChange();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    sidebarListeners.delete(onChange);
    window.removeEventListener('storage', onStorage);
  };
}

/** Persisted expanded/collapsed preference; defaults to expanded. */
export function useStoredSidebarOpen() {
  return useSyncExternalStore(
    subscribeSidebar,
    () => readSidebarOpen() ?? true,
    () => true
  );
}

/** Game-play surfaces where the rail should start collapsed so the board has room. */
export function isCompactGamePath(pathname: string) {
  if (pathname === '/padavali' || pathname === '/padajala') return true;
  if (pathname.startsWith('/padavali/puzzles') || pathname.startsWith('/padajala/puzzles')) {
    return false;
  }
  return pathname.startsWith('/padavali/') || pathname.startsWith('/padajala/');
}

export interface HubPageTitle {
  parent?: string;
  title: string;
}

export function hubPageTitle(pathname: string, collections: ListedCollectionsType): HubPageTitle {
  if (pathname === '/') return { title: 'Home' };
  if (pathname === '/explore' || pathname.startsWith('/explore')) return { title: 'Explore' };
  if (pathname.startsWith('/collections/')) {
    const slug = pathname.split('/')[2] ?? '';
    const collection = collections.find((row) => row.slug === slug);
    return { parent: 'Collections', title: collection?.title ?? 'Collection' };
  }
  if (pathname === '/padavali' || pathname === '/padavali/') {
    return { title: HUB_GAMES.padavali.name };
  }
  if (pathname.startsWith('/padavali/puzzles')) {
    return { parent: HUB_GAMES.padavali.name, title: 'Puzzles' };
  }
  if (pathname.startsWith('/padavali/')) {
    return { parent: HUB_GAMES.padavali.name, title: 'Play' };
  }
  if (pathname === '/padajala' || pathname === '/padajala/') {
    return { title: HUB_GAMES.crossword.name };
  }
  if (pathname.startsWith('/padajala/puzzles')) {
    return { parent: HUB_GAMES.crossword.name, title: 'Puzzles' };
  }
  if (pathname.startsWith('/padajala/')) {
    return { parent: HUB_GAMES.crossword.name, title: 'Play' };
  }
  if (pathname === '/dashboard') return { title: 'Dashboard' };
  return { title: 'Sanskrit Games' };
}
