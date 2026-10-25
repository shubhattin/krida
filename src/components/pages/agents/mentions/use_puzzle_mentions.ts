import { useId, useState, type KeyboardEvent, type RefObject } from 'react';
import { MAX_PUZZLE_REFS, mentionToken, puzzleRefKey } from '~/agents/puzzle_refs';
import type { PuzzleRefData } from '~/agents/ui_message';
import type { GameKind } from '~/util/catalog/tags';
import { mentionOptionId } from './PuzzleMentionMenu';
import {
  findMentionTrigger,
  searchMentions,
  type MentionablePuzzle,
  type MentionIndex,
  type MentionGameFilter
} from './mention_search';
import { useMentionIndex } from './use_mention_index';

const RESULT_LIMIT = 40;

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** `@slug` standing as its own word (trailing punctuation allowed). */
const tokenPattern = (token: string) =>
  new RegExp(`(^|\\s)${escapeRegExp(token)}(?=[\\s.,;:!?)\\]]|$)`, 'g');

const completesMention = (query: string, ref: PuzzleRefData) =>
  query === ref.slug || query.startsWith(`${ref.slug} `);

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

/**
 * `@` mentions for a textarea. The text is the source of truth: a picked puzzle stays
 * referenced while its `@slug` is in the text, so deleting the word drops the mention and
 * the chip's × removes the word.
 */
export function usePuzzleMentions({
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
  const [picked, setPicked] = useState<PuzzleRefData[]>([]);
  const [game, setGame] = useState<MentionGameFilter>('all');
  /** Highlighted row, tied to the query + filter it was chosen for. */
  const [highlight, setHighlight] = useState({ key: '', index: 0 });
  /** `@` position the menu was closed for (Esc or an outside click). */
  const [dismissedStart, setDismissedStart] = useState<number | null>(null);
  const [used, setUsed] = useState(false);

  const refs = picked.filter((ref) => tokenPattern(mentionToken(ref)).test(text));
  const trigger = caret === null ? null : findMentionTrigger(text, caret);
  if (dismissedStart !== null && trigger?.start !== dismissedStart) setDismissedStart(null);
  // Past a complete mention ("@slug ⋯") the menu stays shut; editing the slug reopens it.
  const completed = trigger !== null && refs.some((ref) => completesMention(trigger.query, ref));
  const active = trigger && trigger.start !== dismissedStart && !completed ? trigger : null;

  // Load the list the first time an `@` is typed.
  if (active && !used) setUsed(true);
  const { index, loading, error } = useMentionIndex(used);

  const { search, open, navigable } = menuState({
    query: active?.query ?? null,
    index,
    loading,
    failed: !!error,
    options: { game, preferGame, exclude: new Set(refs.map(puzzleRefKey)), limit: RESULT_LIMIT }
  });

  // A new query or filter starts back at the best match.
  const resultKey = `${active?.query ?? ''}|${game}`;
  const activeIndex = highlight.key === resultKey ? highlight.index : 0;
  const setActiveIndex = (index: number) => setHighlight({ key: resultKey, index });
  const atLimit = refs.length >= MAX_PUZZLE_REFS;

  const placeCaret = (position: number) => {
    setCaret(position);
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(position, position);
    });
  };

  const pick = (puzzle: MentionablePuzzle) => {
    if (!active || caret === null || atLimit) return;
    const ref: PuzzleRefData = {
      id: puzzle.id,
      kind: puzzle.kind,
      slug: puzzle.slug,
      title: puzzle.title
    };
    const next = insertMention(text, active.start, caret, mentionToken(ref));
    setText(next.text);
    setPicked((prev) => [
      ...prev.filter((entry) => puzzleRefKey(entry) !== puzzleRefKey(ref)),
      ref
    ]);
    placeCaret(next.caret);
  };

  const removeRef = (ref: PuzzleRefData) => {
    setPicked((prev) => prev.filter((entry) => puzzleRefKey(entry) !== puzzleRefKey(ref)));
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
    const count = search.results.length;
    if (action === 'close') setDismissedStart(active.start);
    else if (action === 'next') setActiveIndex((activeIndex + 1) % count);
    else if (action === 'previous') setActiveIndex((activeIndex - 1 + count) % count);
    else if (action === 'pick') {
      const puzzle = search.results[activeIndex];
      if (puzzle) pick(puzzle);
    }
    return true;
  };

  const syncCaret = (textarea: HTMLTextAreaElement) =>
    setCaret(textarea.selectionStart === textarea.selectionEnd ? textarea.selectionStart : null);

  return {
    refs,
    clear: () => setPicked([]),
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
      game,
      onGameChange: (next: MentionGameFilter) => {
        setGame(next);
        // The filter's own popup can read as an outside press; keep the menu open.
        setDismissedStart(null);
        if (caret !== null) placeCaret(caret);
      },
      preferGame,
      results: search.results,
      total: search.total,
      loading,
      error: !!error,
      atLimit,
      activeIndex,
      onActiveIndexChange: setActiveIndex,
      onPick: pick
    }
  };
}
