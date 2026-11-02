import { useId, useState, type KeyboardEvent, type RefObject } from 'react';
import {
  MAX_COLLECTION_REFS,
  MAX_PUZZLE_REFS,
  collectionRefKey,
  mentionToken,
  puzzleRefKey,
  refKey
} from '~/agents/puzzle_refs';
import type { CollectionRefData, MentionRefData, PuzzleRefData } from '~/agents/ui_message';
import type { GameKind } from '~/util/catalog/tags';
import { mentionOptionId } from './PuzzleMentionMenu';
import {
  findMentionTrigger,
  searchCollectionMentions,
  searchMentions,
  type MentionableCollection,
  type MentionablePuzzle,
  type MentionIndex,
  type CollectionMentionIndex,
  type MentionGameFilter,
  type MentionTab
} from './mention_search';
import { useMentionIndex } from './use_mention_index';

const RESULT_LIMIT = 40;

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** `@slug` standing as its own word (trailing punctuation allowed). */
const tokenPattern = (token: string) =>
  new RegExp(`(^|\\s)${escapeRegExp(token)}(?=[\\s.,;:!?)\\]]|$)`, 'g');

/** Token text without the leading `@` (puzzle `slug`, collection `collection/<slug>`). */
const tokenBody = (ref: MentionRefData) => mentionToken(ref).slice(1);

const completesMention = (query: string, ref: MentionRefData) => {
  const body = tokenBody(ref);
  return query === body || query.startsWith(`${body} `);
};

/** Replace the typed `@query` (from `start` to the caret) with the mention token. */
function insertMention(text: string, start: number, caret: number, token: string) {
  const after = text.slice(caret);
  // Reuse a space already after the caret instead of doubling it.
  const spaced = after.startsWith(' ') ? token : `${token} `;
  return { text: text.slice(0, start) + spaced + after, caret: start + token.length + 1 };
}

/**
 * Matches for the typed query, and whether the menu shows. A query with a space
 * ("@parvati vivah") stays open only while something matches, so ordinary text after an
 * `@` closes the menu by itself.
 */
function menuState({
  query,
  index,
  loading,
  failed,
  options
}: {
  query: string | null;
  index: MentionIndex | null;
  loading: boolean;
  failed: boolean;
  options: Omit<Parameters<typeof searchMentions>[1], 'query'>;
}) {
  const search =
    query !== null && index
      ? searchMentions(index, { ...options, query })
      : { results: [], total: 0 };
  const settled = !loading && !failed && search.results.length === 0;
  const open = query !== null && !(settled && query.includes(' '));
  return { search, open, navigable: open && !loading && search.results.length > 0 };
}

/** A leading `collection/` (or `collection `) narrows to the rest: `@collection/ram`. */
const stripCollectionPrefix = (query: string) => query.replace(/^collection[/\s]+/i, '');

function collectionMenuState({
  query,
  index,
  loading,
  failed,
  options
}: {
  query: string | null;
  index: CollectionMentionIndex | null;
  loading: boolean;
  failed: boolean;
  options: Omit<Parameters<typeof searchCollectionMentions>[1], 'query'>;
}) {
  const search =
    query !== null && index
      ? searchCollectionMentions(index, { ...options, query: stripCollectionPrefix(query) })
      : { results: [], total: 0 };
  const settled = !loading && !failed && search.results.length === 0;
  const open = query !== null && !(settled && query.includes(' '));
  return { search, open, navigable: open && !loading && search.results.length > 0 };
}

function menuKeyAction(event: KeyboardEvent, navigable: boolean, loading: boolean) {
  if (event.key === 'Escape') return 'close';
  // Still loading: Enter means "pick", so don't let it send the message meanwhile.
  if (loading && event.key === 'Enter') return 'wait';
  if (!navigable) return null;
  if (event.key === 'ArrowDown') return 'next';
  if (event.key === 'ArrowUp') return 'previous';
  if ((event.key === 'Enter' || event.key === 'Tab') && !event.shiftKey) return 'pick';
  return null;
}

type TabMenuState = {
  search: { results: (MentionablePuzzle | MentionableCollection)[]; total: number };
  open: boolean;
  navigable: boolean;
  /** Tag for the highlighted row: a new tab, query or filter starts back at the best match. */
  resultKey: string;
  atLimit: boolean;
};

/** The active tab's slice of the two menus' state. */
function selectTabMenu({
  tab,
  query,
  game,
  puzzles,
  collections,
  puzzleRefCount,
  collectionRefCount
}: {
  tab: MentionTab;
  query: string;
  game: MentionGameFilter;
  puzzles: { search: TabMenuState['search']; open: boolean; navigable: boolean };
  collections: { search: TabMenuState['search']; open: boolean; navigable: boolean };
  puzzleRefCount: number;
  collectionRefCount: number;
}): TabMenuState {
  const state = tab === 'puzzles' ? puzzles : collections;
  return {
    ...state,
    resultKey: `${tab}|${query}|${game}`,
    atLimit:
      tab === 'puzzles'
        ? puzzleRefCount >= MAX_PUZZLE_REFS
        : collectionRefCount >= MAX_COLLECTION_REFS
  };
}

/** Pick the highlighted row of the active tab's menu. */
function pickActive({
  tab,
  puzzles,
  collections,
  activeIndex,
  pickPuzzle,
  pickCollection
}: {
  tab: MentionTab;
  puzzles: { results: MentionablePuzzle[] };
  collections: { results: MentionableCollection[] };
  activeIndex: number;
  pickPuzzle: (puzzle: MentionablePuzzle) => void;
  pickCollection: (collection: MentionableCollection) => void;
}) {
  if (tab === 'puzzles') {
    const puzzle = puzzles.results[activeIndex];
    if (puzzle) pickPuzzle(puzzle);
  } else {
    const collection = collections.results[activeIndex];
    if (collection) pickCollection(collection);
  }
}

/** The `@query` being typed, unless dismissed, completed, or absent. Past a complete
 * mention ("@slug ⋯") the menu stays shut; editing the slug reopens it. */
function resolveActiveTrigger({
  trigger,
  dismissedStart,
  refs
}: {
  trigger: { start: number; query: string } | null;
  dismissedStart: number | null;
  refs: MentionRefData[];
}) {
  if (!trigger || trigger.start === dismissedStart) return null;
  if (refs.some((ref) => completesMention(trigger.query, ref))) return null;
  return trigger;
}

/**
 * `@` mentions for a textarea, with Puzzles and Collections tabs. The text is the source
 * of truth: a picked mention stays referenced while its token (`@slug` for puzzles,
 * `@collection/<slug>` for collections) is in the text, so deleting the word drops the
 * mention and the chip's × removes the word.
 */
export function useMentions({
  text,
  setText,
  textareaRef,
  preferGame
}: {
  text: string;
  setText: (text: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  preferGame: GameKind | null;
}) {
  const listId = useId();
  const [caret, setCaret] = useState<number | null>(null);
  const [picked, setPicked] = useState<MentionRefData[]>([]);
  const [tab, setTab] = useState<MentionTab>('puzzles');
  const [game, setGame] = useState<MentionGameFilter>('all');
  /** Highlighted row, tied to the tab + query + filter it was chosen for. */
  const [highlight, setHighlight] = useState({ key: '', index: 0 });
  /** `@` position the menu was closed for (Esc or an outside click). */
  const [dismissedStart, setDismissedStart] = useState<number | null>(null);
  const [used, setUsed] = useState(false);

  const refs = picked.filter((ref) => tokenPattern(mentionToken(ref)).test(text));
  const puzzleRefs = refs.filter((ref): ref is PuzzleRefData => 'kind' in ref);
  const collectionRefs = refs.filter((ref): ref is CollectionRefData => !('kind' in ref));
  const trigger = caret === null ? null : findMentionTrigger(text, caret);
  if (dismissedStart !== null && trigger?.start !== dismissedStart) setDismissedStart(null);
  const active = resolveActiveTrigger({ trigger, dismissedStart, refs });

  // Load the lists the first time an `@` is typed.
  if (active && !used) setUsed(true);
  const { index, collectionIndex, loading, error } = useMentionIndex(used);

  const puzzles = menuState({
    query: active?.query ?? null,
    index,
    loading,
    failed: !!error,
    options: {
      game,
      preferGame,
      exclude: new Set(puzzleRefs.map(puzzleRefKey)),
      limit: RESULT_LIMIT
    }
  });
  const collections = collectionMenuState({
    query: active?.query ?? null,
    index: collectionIndex,
    loading,
    failed: !!error,
    options: { exclude: new Set(collectionRefs.map(collectionRefKey)), limit: RESULT_LIMIT }
  });

  const activeMenu = selectTabMenu({
    tab,
    query: active?.query ?? '',
    game,
    puzzles,
    collections,
    puzzleRefCount: puzzleRefs.length,
    collectionRefCount: collectionRefs.length
  });
  const { search: activeSearch, open, navigable, resultKey, atLimit } = activeMenu;

  // A new tab, query or filter starts back at the best match.
  const activeIndex = highlight.key === resultKey ? highlight.index : 0;
  const setActiveIndex = (index: number) => setHighlight({ key: resultKey, index });

  const placeCaret = (position: number) => {
    setCaret(position);
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(position, position);
    });
  };

  const addRef = (ref: MentionRefData) => {
    if (!active || caret === null || atLimit) return;
    const next = insertMention(text, active.start, caret, mentionToken(ref));
    setText(next.text);
    setPicked((prev) => [...prev.filter((entry) => refKey(entry) !== refKey(ref)), ref]);
    placeCaret(next.caret);
  };

  const pickPuzzle = (puzzle: MentionablePuzzle) =>
    addRef({ id: puzzle.id, kind: puzzle.kind, slug: puzzle.slug, title: puzzle.title });

  const pickCollection = (collection: MentionableCollection) =>
    addRef({
      id: collection.id,
      uid: collection.uid,
      slug: collection.slug,
      title: collection.title
    });

  const removeRef = (ref: MentionRefData) => {
    setPicked((prev) => prev.filter((entry) => refKey(entry) !== refKey(ref)));
    const token = escapeRegExp(mentionToken(ref));
    // The token with the space after it, else the bare token (end of text, punctuation).
    setText(
      text
        .replace(new RegExp(`(^|\\s)${token} (?=\\S)`, 'g'), '$1')
        .replace(tokenPattern(mentionToken(ref)), '$1')
    );
  };

  /** Type an `@` at the caret (the toolbar button), opening the menu. */
  const startMention = () => {
    const textarea = textareaRef.current;
    const position = textarea?.selectionStart ?? text.length;
    const lead = position > 0 && !/\s/.test(text[position - 1]!) ? ' ' : '';
    setText(text.slice(0, position) + lead + '@' + text.slice(position));
    setDismissedStart(null);
    placeCaret(position + lead.length + 1);
  };

  /** Returns true when the key was used by the menu. */
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!open || !active || event.nativeEvent.isComposing) return false;
    const action = menuKeyAction(event, navigable, loading);
    if (!action) return false;
    event.preventDefault();
    if (action === 'close') setDismissedStart(active.start);
    else if (action === 'next') {
      const count = activeSearch.results.length;
      setActiveIndex((activeIndex + 1) % count);
    } else if (action === 'previous') {
      const count = activeSearch.results.length;
      setActiveIndex((activeIndex - 1 + count) % count);
    } else if (action === 'pick') {
      pickActive({
        tab,
        puzzles: puzzles.search,
        collections: collections.search,
        activeIndex,
        pickPuzzle,
        pickCollection
      });
    }
    return true;
  };

  const syncCaret = (textarea: HTMLTextAreaElement) =>
    setCaret(textarea.selectionStart === textarea.selectionEnd ? textarea.selectionStart : null);

  return {
    refs,
    clear: () => setPicked([]),
    /** Put back refs saved in a queued draft (the text already carries their tokens). */
    restoreRefs: (refs: MentionRefData[]) => setPicked(refs),
    removeRef,
    startMention,
    handleKeyDown,
    syncCaret,
    /** ARIA wiring for the textarea (combobox pattern; focus never leaves it). */
    textareaAria: {
      role: 'combobox',
      'aria-autocomplete': 'list',
      'aria-expanded': open,
      'aria-controls': open ? listId : undefined,
      'aria-activedescendant': navigable ? mentionOptionId(listId, activeIndex) : undefined
    } as const,
    menu: {
      open,
      onDismiss: () => {
        if (active) setDismissedStart(active.start);
      },
      listId,
      query: active?.query ?? '',
      tab,
      onTabChange: (next: MentionTab) => {
        setTab(next);
        // The tab buttons can read as an outside press; keep the menu open.
        setDismissedStart(null);
        if (caret !== null) placeCaret(caret);
      },
      game,
      onGameChange: (next: MentionGameFilter) => {
        setGame(next);
        // The filter's own popup can read as an outside press; keep the menu open.
        setDismissedStart(null);
        if (caret !== null) placeCaret(caret);
      },
      preferGame,
      puzzleResults: puzzles.search.results,
      puzzleTotal: puzzles.search.total,
      collectionResults: collections.search.results,
      collectionTotal: collections.search.total,
      loading,
      error: !!error,
      atLimit,
      activeIndex,
      onActiveIndexChange: setActiveIndex,
      onPickPuzzle: pickPuzzle,
      onPickCollection: pickCollection
    }
  };
}

/** Back-compat alias. */
export const usePuzzleMentions = useMentions;
