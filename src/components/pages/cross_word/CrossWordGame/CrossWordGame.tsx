'use client';

import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { InfoIcon } from 'lucide-react';
import { IoShareSocialOutline } from 'react-icons/io5';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
// import { Switch } from '~/components/ui/switch';
// import { Label } from '~/components/ui/label';
import { CrossWordGrid } from './CrossWordGrid';
import { GameProgress } from './GameProgress';
import { GameControls } from './GameControls';
import { CompletionCelebration } from './CompletionCelebration';
import { CrossWordOnScreenKeyboard } from './CrossWordOnScreenKeyboard';
import {
  CROSSWORD_KB_ATTR,
  CrossWordKeyboardBridge,
  type CrossWordKeyboardBridgeHandle
} from './CrossWordKeyboardBridge';
import { CluePanel } from './CluePanel';
import { get_general_share_msg } from './share';
import {
  CompletionMoreCrosswordPuzzlesCarousel,
  getCrosswordCarouselPuzzlesQueryFn,
  MoreCrosswordPuzzlesAccordion
} from './MorePuzzlesCarousel';
import { useCrossWordGame } from './useCrossWordGame';
import { useMoreHints } from './useMoreHints';
import { shouldAutoOpenOnScreenKeyboard } from './touch_device';
import {
  puzzle_atom,
  started_atom,
  completed_atom,
  pending_navigation_url_atom
} from './game_state';
import { cn } from '~/lib/utils';
import { copy_text_to_clipboard } from '~/tools/kry';
import type { Attachment } from '~/util/puzzle/attachments';
import type { location_list_type } from '~/db/types';
import { MediaAttachments } from '~/components/pages/puzzle/MediaAttachments';
import { useTRPC } from '~/api/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '~/components/ui/alert-dialog';
import titleStyles from '~/components/pages/puzzle/puzzle-title.module.css';

/**
 * Experimentation flag: how players type letters into the crossword.
 *
 * - `true`  → In-app on-screen keyboard (`CrossWordOnScreenKeyboard`). Physical
 *             keyboards still work via the window `keydown` listener.
 * - `false` → No in-app keyboard UI. A tiny hidden `<input>` (`CrossWordKeyboardBridge`)
 *             is focused on cell tap so mobile OS soft keyboards open and capture
 *             keystrokes (same pattern we used before the custom keyboard).
 *
 * Flip this to A/B test which path feels better on phones/tablets, then lock in
 * the winner as the permanent default.
 */
const INPUT_VIRTUAL_KEYBOARD_ENABLED = true;

async function shareText(title: string, text: string, successToast: string) {
  try {
    if (navigator.share) {
      await navigator.share({ title, text });
    } else {
      try {
        await copy_text_to_clipboard(text);
        toast.success(successToast);
      } catch (err) {
        toast.error('Could not copy to clipboard');
        console.log('Error copying:', err);
      }
    }
  } catch (err) {
    // SAFETY: navigator.share rejections are DOMException errors carrying .name
    if ((err as Error).name !== 'AbortError') {
      console.log('Error sharing:', err);
    }
  }
}

/** Form targets that should swallow their own keys, not the crossword's. */
function isEditableFormTarget(target: HTMLElement) {
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
}

/** The hidden bridge input is only active on the native-keyboard path mid-game. */
function isBridgeKeyboardActive(useVirtualKeyboard: boolean, started: boolean, completed: boolean) {
  return !useVirtualKeyboard && started && !completed;
}

function LeaveGameDialog({
  pendingUrl,
  onCancel,
  onLeave
}: {
  pendingUrl: string | null;
  onCancel: () => void;
  onLeave: () => void;
}) {
  return (
    <AlertDialog
      open={!!pendingUrl}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to leave?</AlertDialogTitle>
          <AlertDialogDescription>
            Your current crossword progress will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onLeave}>Leave Game</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CrosswordHeader({
  puzzle,
  listed,
  puzzleSlug
}: {
  puzzle: NonNullable<ReturnType<typeof useCrossWordGame>['puzzle']>;
  listed: boolean;
  puzzleSlug: string | null;
}) {
  const handleShare = () => {
    void shareText(
      `${puzzle.title} - Padajāla`,
      get_general_share_msg(puzzle.title, puzzleSlug!, puzzle.description),
      'Puzzle link copied to clipboard'
    );
  };

  return (
    <motion.header
      className="mb-3 flex items-center justify-center text-center sm:mb-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <h1
        className={`inline text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl ${titleStyles.titleGradient}`}
      >
        {puzzle.title}
      </h1>
      {puzzle.description.trim() ? (
        <Popover>
          <PopoverTrigger
            render={<button className="mt-2 ml-3 align-middle outline-none hover:brightness-75" />}
          >
            <InfoIcon className="size-3 sm:size-4" />
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="center"
            className="z-80 w-fit max-w-[calc(100vw-32px)] overflow-hidden rounded-xl border border-slate-200 bg-linear-to-r from-amber-50 to-orange-50 px-3 py-2 shadow-xl outline-none sm:max-w-md md:max-w-lg dark:border-slate-700 dark:from-teal-950/80 dark:to-green-950/80"
          >
            <div className="text-sm font-semibold wrap-break-word whitespace-normal text-stone-600 dark:text-stone-200">
              {puzzle.description}
            </div>
          </PopoverContent>
        </Popover>
      ) : null}
      {listed && puzzleSlug ? (
        <button
          type="button"
          onClick={handleShare}
          className="mt-2 ml-3 inline-flex items-center justify-center align-middle text-slate-500 outline-none hover:text-slate-700 hover:brightness-75 dark:text-slate-400 dark:hover:text-slate-200"
          title="Share Puzzle"
          aria-label="Share Puzzle"
        >
          <IoShareSocialOutline className="size-3.5 sm:size-4.5" />
        </button>
      ) : null}
    </motion.header>
  );
}

/** Reserve seam space for the floating toggle when the keyboard panel is closed. */
function boardSeamClass(
  useVirtualKeyboard: boolean,
  started: boolean,
  completed: boolean,
  keyboardPanelOpen: boolean
) {
  return useVirtualKeyboard && started && !completed && !keyboardPanelOpen ? 'pb-4' : undefined;
}

function BoardColumn({
  game,
  moreHints,
  boardAnchorRef,
  keyboardRef,
  useVirtualKeyboard,
  started,
  completed,
  keyboardPanelOpen,
  onKeyboardOpenChange,
  requestKeyboard,
  onAfterStart
}: {
  game: ReturnType<typeof useCrossWordGame>;
  moreHints: ReturnType<typeof useMoreHints>;
  boardAnchorRef: RefObject<HTMLDivElement | null>;
  keyboardRef: RefObject<CrossWordKeyboardBridgeHandle | null>;
  useVirtualKeyboard: boolean;
  started: boolean;
  completed: boolean;
  keyboardPanelOpen: boolean;
  onKeyboardOpenChange: (open: boolean) => void;
  requestKeyboard: () => void;
  onAfterStart: () => void;
}) {
  return (
    <div className="order-1 flex w-full flex-col items-center gap-1 sm:gap-4 lg:order-2 lg:col-span-6">
      <div
        ref={boardAnchorRef}
        className={cn(
          'relative w-full max-w-[min(100%,24rem)] lg:max-w-100 xl:max-w-104 2xl:max-w-108',
          boardSeamClass(useVirtualKeyboard, started, completed, keyboardPanelOpen)
        )}
      >
        {!useVirtualKeyboard ? (
          <CrossWordKeyboardBridge
            ref={keyboardRef}
            onKeyDown={game.handleKeyDown}
            onTypeLetter={game.typeLetter}
            onBackspace={game.backspace}
          />
        ) : null}
        <CrossWordGrid
          game={game}
          onRequestKeyboard={useVirtualKeyboard ? undefined : requestKeyboard}
        />
        {!started ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/25 backdrop-blur-[2px]">
            <GameControls game={game} onAfterStart={onAfterStart} />
          </div>
        ) : null}
        {/* Toggle sits on the grid/keyboard seam so it doesn't add a gap row. */}
        {started && !completed ? (
          <div className="absolute right-1 bottom-0 z-20 translate-y-1/2 sm:right-0">
            <CrossWordOnScreenKeyboard
              enabled={useVirtualKeyboard}
              open={keyboardPanelOpen}
              onOpenChange={onKeyboardOpenChange}
              onTypeLetter={game.typeLetter}
              onBackspace={game.backspace}
              onToggleDirection={game.toggleDirection}
              canToggleDirection={game.canToggleDirection}
              toggleOnly
            />
          </div>
        ) : null}
      </div>

      {started && !completed ? (
        <CrossWordOnScreenKeyboard
          enabled={useVirtualKeyboard}
          open={keyboardPanelOpen}
          onOpenChange={onKeyboardOpenChange}
          onTypeLetter={game.typeLetter}
          onBackspace={game.backspace}
          onToggleDirection={game.toggleDirection}
          canToggleDirection={game.canToggleDirection}
          panelOnly
        />
      ) : null}

      {/* Mobile: full clue list directly under the active clue / grid */}
      <CluePanel
        game={game}
        moreHints={moreHints}
        className="mt-2 max-h-72 w-full max-w-[min(100%,24rem)] sm:max-h-80 lg:hidden"
      />

      {started && completed ? (
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <GameControls game={game} onAfterStart={onAfterStart} />
        </motion.div>
      ) : null}
    </div>
  );
}

function MediaSidebar({ attachments, started }: { attachments?: Attachment[]; started: boolean }) {
  const hasMedia = !!(attachments && attachments.length > 0);

  return (
    <div
      className={cn(
        'order-2 flex min-w-0 items-center justify-center lg:order-1 lg:col-span-3',
        !started && 'lg:mt-10'
      )}
    >
      {hasMedia ? (
        <div className="lg:sticky lg:top-6">
          <MediaAttachments attachments={attachments!} className="max-w-md lg:max-w-sm" />
        </div>
      ) : null}
    </div>
  );
}

function ClueSidebar({
  game,
  moreHints,
  started,
  completed
}: {
  game: ReturnType<typeof useCrossWordGame>;
  moreHints: ReturnType<typeof useMoreHints>;
  started: boolean;
  completed: boolean;
}) {
  return (
    <div className="order-3 hidden min-w-0 lg:col-span-3 lg:block">
      <div className={cn('lg:sticky lg:top-4', started && !completed ? 'lg:-mt-16' : 'lg:-mt-10')}>
        <CluePanel game={game} moreHints={moreHints} className="max-h-[min(70vh,36rem)]" />
      </div>
    </div>
  );
}

/** Prompt before leaving (refresh / back) while a game is in progress. */
function useLeaveGuard(started: boolean, completed: boolean) {
  useEffect(() => {
    if (!(started && !completed)) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    const handlePopState = () => {
      const confirmLeave = window.confirm(
        'Are you sure you want to leave? Your current game progress will be lost.'
      );
      if (!confirmLeave) {
        window.history.pushState(null, '', window.location.href);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    window.history.pushState(null, '', window.location.href);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [started, completed]);
}

/** Native soft-keyboard path: grow bottom padding by the keyboard inset. */
function useKeyboardInset(
  keyboardInsetEnabled: boolean,
  boardAnchorRef: RefObject<HTMLDivElement | null>
) {
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    if (!keyboardInsetEnabled) return;
    const vv = window.visualViewport;
    if (!vv) return;

    const syncKeyboardLayout = () => {
      const bridgeFocused = document.activeElement?.getAttribute(CROSSWORD_KB_ATTR) === 'true';
      if (!bridgeFocused) {
        setKeyboardInset(0);
        return;
      }

      const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      setKeyboardInset(inset);

      // Keyboard just opened / resized and is covering the board — lift it once.
      if (inset < 48 || !boardAnchorRef.current) return;
      const rect = boardAnchorRef.current.getBoundingClientRect();
      const visibleBottom = vv.offsetTop + vv.height;
      if (rect.bottom > visibleBottom - 12) {
        boardAnchorRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    };

    vv.addEventListener('resize', syncKeyboardLayout);
    // focusout runs before the next activeElement is set; defer so blur clears inset.
    const onFocusChange = () => {
      window.setTimeout(syncKeyboardLayout, 0);
    };
    document.addEventListener('focusin', onFocusChange);
    document.addEventListener('focusout', onFocusChange);
    syncKeyboardLayout();

    return () => {
      vv.removeEventListener('resize', syncKeyboardLayout);
      document.removeEventListener('focusin', onFocusChange);
      document.removeEventListener('focusout', onFocusChange);
      setKeyboardInset(0);
    };
  }, [keyboardInsetEnabled, boardAnchorRef]);

  return keyboardInset;
}

/** Selectors that should never clear the crossword cell selection on click. */
const CLICK_OUTSIDE_IGNORE_SELECTOR = [
  '[role="grid"]',
  'button',
  '[data-slot="popover-content"]',
  '[data-slot="alert-dialog-content"]',
  '[data-slot="alert-dialog-overlay"]',
  '[data-crossword-onscreen-kb="true"]',
  `[${CROSSWORD_KB_ATTR}="true"]`
];

/** Click outside to deselect grid focus. Also active after completion (review mode). */
function useClickOutsideClearsFocus(onClear: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const handleDocumentClick = (event: MouseEvent) => {
      // SAFETY: click targets on document are DOM nodes
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (CLICK_OUTSIDE_IGNORE_SELECTOR.some((selector) => target.closest(selector))) return;

      onClear();
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [onClear, enabled]);
}

/** Forward window keydown events to the game while it is active. */
function useWindowKeyForwarder(handleKeyDown: (event: KeyboardEvent) => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      // SAFETY: keydown targets on document are DOM nodes
      const target = event.target as HTMLElement | null;
      if (!target) {
        handleKeyDown(event);
        return;
      }

      // Bridge owns its own key/input events — avoid double handling.
      if (target.getAttribute(CROSSWORD_KB_ATTR) === 'true') return;

      if (isEditableFormTarget(target)) {
        return;
      }

      handleKeyDown(event);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleKeyDown, enabled]);
}

/** Clear a running interval timer when the component unmounts. */
function useClearTimerOnUnmount(timerRef: RefObject<ReturnType<typeof setInterval> | null>) {
  useEffect(() => {
    const timer = timerRef;
    return () => {
      const timerId = timer.current;
      if (timerId) clearInterval(timerId);
    };
  }, [timerRef]);
}

function shouldShowAccordion(completed: boolean, location: location_list_type) {
  return !completed && (location === 'main_page' || location === 'view_page');
}

function isKeyboardPanelOpen(open: boolean, started: boolean, completed: boolean) {
  return open && started && !completed;
}

function overscrollBehaviorFor(started: boolean, completed: boolean) {
  return started && !completed ? 'contain' : 'auto';
}

/** Lift the board into view when the soft keyboard covers it. */
function scrollBoardIntoViewIfCovered(
  boardAnchorRef: RefObject<HTMLDivElement | null>,
  vv: VisualViewport
) {
  const el = boardAnchorRef.current;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const visibleBottom = vv.offsetTop + vv.height;
  if (rect.bottom > visibleBottom - 12) {
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

/** Prefetch carousel puzzles and (when a slug is given) more-hints data. */
function useCrosswordPrefetch(
  puzzle: ReturnType<typeof useCrossWordGame>['puzzle'],
  puzzleSlug: string | null | undefined
) {
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const slug = puzzleSlug ?? undefined;

  useEffect(() => {
    if (!puzzle) return;
    queryClient.prefetchQuery({
      queryKey: ['crossword_listed_puzzles_carousel', slug, puzzle.id],
      queryFn: getCrosswordCarouselPuzzlesQueryFn(slug, puzzle.id)
    });
    if (slug) {
      void queryClient.prefetchQuery(
        trpc.public_ai.get_crossword_more_hints.queryOptions({
          puzzle_id: puzzle.id,
          puzzle_slug: slug
        })
      );
    }
  }, [puzzle, slug, queryClient, trpc]);
}

export function CrossWordGame({
  attachments,
  listed = false,
  puzzleSlug = null,
  location = 'main_page'
}: {
  attachments?: Attachment[];
  listed?: boolean;
  puzzleSlug?: string | null;
  location?: location_list_type;
}) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const keyboardRef = useRef<CrossWordKeyboardBridgeHandle>(null);
  const boardAnchorRef = useRef<HTMLDivElement>(null);
  const game = useCrossWordGame(timerRef);
  const puzzle = useAtomValue(puzzle_atom);
  const started = useAtomValue(started_atom);
  const completed = useAtomValue(completed_atom);
  const [pendingUrl, setPendingUrl] = useAtom(pending_navigation_url_atom);
  const navigate = useNavigate();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const keyboardPanelOpen = isKeyboardPanelOpen(keyboardOpen, started, completed);
  const [useVirtualKeyboard] = useState(INPUT_VIRTUAL_KEYBOARD_ENABLED);
  const moreHints = useMoreHints(puzzle?.id, puzzleSlug, puzzle?.entries);

  const showAccordion = shouldShowAccordion(completed, location);
  const showCompletionCarousel = completed;
  const carouselExcludeSlug = puzzleSlug ?? undefined;

  useCrosswordPrefetch(puzzle, puzzleSlug);
  useLeaveGuard(started, completed);
  useClearTimerOnUnmount(timerRef);

  /**
   * Focus the hidden bridge input (native-keyboard experiment path only).
   * Must run inside a user gesture (Start / cell tap) so mobile browsers allow
   * the OS soft keyboard to open.
   */
  const requestKeyboard = useCallback(() => {
    if (useVirtualKeyboard || completed) return;
    keyboardRef.current?.focus();
    const vv = window.visualViewport;
    if (vv) scrollBoardIntoViewIfCovered(boardAnchorRef, vv);
  }, [completed, useVirtualKeyboard]);

  const handleAfterStart = () => {
    if (useVirtualKeyboard) {
      // Auto-open only on touch-capable devices (phones, tablets, touch laptops).
      // Desktop users keep a closed panel and can reveal it via the keyboard icon.
      if (shouldAutoOpenOnScreenKeyboard()) {
        setKeyboardOpen(true);
      }
      return;
    }
    // Native-input path: focus the bridge so the OS soft keyboard can appear.
    requestKeyboard();
  };

  // Physical keyboard input while the game is active (and the bridge is NOT focused).
  useWindowKeyForwarder(game.handleKeyDown, started);

  /**
   * Native soft-keyboard path: grow bottom padding by the keyboard inset so the
   * clue list can be scrolled into the visible area above the OS keyboard.
   *
   * Only nudge the board into view when the keyboard is covering it. Do NOT
   * listen to visualViewport `scroll` — that fights intentional scrolling toward
   * the clues (the previous bug).
   */
  const keyboardInsetEnabled = isBridgeKeyboardActive(useVirtualKeyboard, started, completed);
  const keyboardInset = useKeyboardInset(keyboardInsetEnabled, boardAnchorRef);
  const effectiveKeyboardInset = keyboardInsetEnabled ? keyboardInset : 0;

  // Click outside to deselect grid focus — keyboard panel buttons are excluded
  // via the generic `button` check so typing never clears selection.
  // Also active after completion so review selection can be cleared.
  useClickOutsideClearsFocus(game.clearFocus, started);

  if (!puzzle) return null;

  return (
    <div
      className={cn(
        'mx-auto w-full max-w-7xl bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 px-2 pt-2 pb-2 sm:px-4 sm:pt-3 sm:pb-4 md:px-6',
        'dark:from-slate-900 dark:via-slate-800 dark:to-slate-900'
      )}
      style={{
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: overscrollBehaviorFor(started, completed),
        // Extra scroll room while the OS keyboard is open (native-input path only).
        // React ignores `undefined` style values, so this matches conditional omission.
        paddingBottom:
          effectiveKeyboardInset > 0 ? `calc(${effectiveKeyboardInset}px + 1.5rem)` : undefined
      }}
    >
      <LeaveGameDialog
        pendingUrl={pendingUrl}
        onCancel={() => setPendingUrl(null)}
        onLeave={() => {
          if (pendingUrl) {
            navigate({ href: pendingUrl });
            setPendingUrl(null);
          }
        }}
      />

      {showCompletionCarousel ? (
        <div className="mb-3 sm:mb-4">
          <CompletionMoreCrosswordPuzzlesCarousel
            excludeSlug={carouselExcludeSlug}
            excludeId={puzzle.id}
          />
        </div>
      ) : null}

      <CrosswordHeader puzzle={puzzle} listed={listed} puzzleSlug={puzzleSlug} />

      {showAccordion ? (
        <div className="mb-3 w-full sm:mb-4">
          <MoreCrosswordPuzzlesAccordion excludeSlug={carouselExcludeSlug} excludeId={puzzle.id} />
        </div>
      ) : null}

      <div className="mb-3 flex flex-col items-center gap-3 sm:mb-4">
        <GameProgress
          onReset={game.resetGame}
          revealingEntryId={game.revealingEntryId}
          onReveal={game.revealEntry}
        />
        <CompletionCelebration listed={listed} puzzleSlug={puzzleSlug} />
      </div>

      <div
        className={cn(
          'grid grid-cols-1 gap-y-4 sm:gap-y-5',
          'lg:grid-cols-12 lg:items-start lg:gap-x-4 xl:gap-x-5'
        )}
      >
        {/* Left on desktop / below grid on mobile — matches padavali order */}
        <MediaSidebar attachments={attachments} started={started} />

        {/* Center: grid + keyboard + active clue + controls */}
        <BoardColumn
          game={game}
          moreHints={moreHints}
          boardAnchorRef={boardAnchorRef}
          keyboardRef={keyboardRef}
          useVirtualKeyboard={useVirtualKeyboard}
          started={started}
          completed={completed}
          keyboardPanelOpen={keyboardPanelOpen}
          onKeyboardOpenChange={setKeyboardOpen}
          requestKeyboard={requestKeyboard}
          onAfterStart={handleAfterStart}
        />

        {/* Desktop: clue list replaces the former game-help sidebar */}
        <ClueSidebar game={game} moreHints={moreHints} started={started} completed={completed} />
      </div>

      {/* On-screen keyboard toggle — hidden for now
      <div className="mt-6 flex items-center justify-center gap-2.5 border-t border-border/40 pt-4">
        <Switch
          id="crossword-virtual-keyboard"
          size="sm"
          checked={useVirtualKeyboard}
          onCheckedChange={(checked) => {
            setUseVirtualKeyboard(checked);
            if (!checked) setKeyboardOpen(false);
          }}
          aria-label="Use in-app on-screen keyboard"
        />
        <Label
          htmlFor="crossword-virtual-keyboard"
          className="cursor-pointer text-xs font-medium text-muted-foreground"
        >
          On-screen keyboard
        </Label>
      </div>
      */}
    </div>
  );
}
