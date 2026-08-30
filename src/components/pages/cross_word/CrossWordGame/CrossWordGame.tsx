'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const keyboardPanelOpen = keyboardOpen && started && !completed;
  const hasMedia = !!(attachments && attachments.length > 0);
  const [useVirtualKeyboard] = useState(INPUT_VIRTUAL_KEYBOARD_ENABLED);
  const moreHints = useMoreHints(puzzle?.id, puzzleSlug, puzzle?.entries);

  const showAccordion = !completed && (location === 'main_page' || location === 'view_page');
  const showCompletionCarousel = completed;

  useEffect(() => {
    if (!puzzle) return;
    queryClient.prefetchQuery({
      queryKey: ['crossword_listed_puzzles_carousel', puzzleSlug ?? undefined, puzzle.id],
      queryFn: getCrosswordCarouselPuzzlesQueryFn(puzzleSlug ?? undefined, puzzle.id)
    });
    if (puzzleSlug) {
      void queryClient.prefetchQuery(
        trpc.public_ai.get_crossword_more_hints.queryOptions({
          puzzle_id: puzzle.id,
          puzzle_slug: puzzleSlug
        })
      );
    }
  }, [puzzle, puzzleSlug, queryClient, trpc]);

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

  useEffect(() => {
    const timer = timerRef;
    return () => {
      const timerId = timer.current;
      if (timerId) clearInterval(timerId);
    };
  }, []);

  /**
   * Focus the hidden bridge input (native-keyboard experiment path only).
   * Must run inside a user gesture (Start / cell tap) so mobile browsers allow
   * the OS soft keyboard to open.
   */
  const requestKeyboard = useCallback(() => {
    if (useVirtualKeyboard || completed) return;
    keyboardRef.current?.focus();
    const vv = window.visualViewport;
    if (vv && boardAnchorRef.current) {
      const rect = boardAnchorRef.current.getBoundingClientRect();
      const visibleBottom = vv.offsetTop + vv.height;
      if (rect.bottom > visibleBottom - 12) {
        boardAnchorRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
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
  useEffect(() => {
    if (!started) return;
    const onKeyDown = (event: KeyboardEvent) => {
      // SAFETY: keydown targets on document are DOM nodes
      const target = event.target as HTMLElement | null;
      if (!target) {
        game.handleKeyDown(event);
        return;
      }

      // Bridge owns its own key/input events — avoid double handling.
      if (target.getAttribute(CROSSWORD_KB_ATTR) === 'true') return;

      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      game.handleKeyDown(event);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [game, started]);

  /**
   * Native soft-keyboard path: grow bottom padding by the keyboard inset so the
   * clue list can be scrolled into the visible area above the OS keyboard.
   *
   * Only nudge the board into view when the keyboard is covering it. Do NOT
   * listen to visualViewport `scroll` — that fights intentional scrolling toward
   * the clues (the previous bug).
   */
  const [keyboardInset, setKeyboardInset] = useState(0);
  const keyboardInsetEnabled = !useVirtualKeyboard && started && !completed;
  const effectiveKeyboardInset = keyboardInsetEnabled ? keyboardInset : 0;

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
  }, [keyboardInsetEnabled]);

  // Click outside to deselect grid focus — keyboard panel buttons are excluded
  // via the generic `button` check so typing never clears selection.
  // Also active after completion so review selection can be cleared.
  useEffect(() => {
    if (!started) return;

    const handleDocumentClick = (event: MouseEvent) => {
      // SAFETY: click targets on document are DOM nodes
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (target.closest('[role="grid"]')) return;
      if (target.closest('button')) return;
      if (target.closest('[data-slot="popover-content"]')) return;
      if (target.closest('[data-slot="alert-dialog-content"]')) return;
      if (target.closest('[data-slot="alert-dialog-overlay"]')) return;
      if (target.closest('[data-crossword-onscreen-kb="true"]')) return;
      if (target.closest(`[${CROSSWORD_KB_ATTR}="true"]`)) return;

      game.clearFocus();
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [game, started]);

  if (!puzzle) return null;

  return (
    <div
      className={cn(
        'mx-auto w-full max-w-7xl bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 px-2 pt-2 pb-2 sm:px-4 sm:pt-3 sm:pb-4 md:px-6',
        'dark:from-slate-900 dark:via-slate-800 dark:to-slate-900'
      )}
      style={{
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: started && !completed ? 'contain' : 'auto',
        // Extra scroll room while the OS keyboard is open (native-input path only).
        ...(effectiveKeyboardInset > 0
          ? { paddingBottom: `calc(${effectiveKeyboardInset}px + 1.5rem)` }
          : {})
      }}
    >
      <AlertDialog
        open={!!pendingUrl}
        onOpenChange={(open) => {
          if (!open) setPendingUrl(null);
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
            <AlertDialogCancel onClick={() => setPendingUrl(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingUrl) {
                  navigate({ href: pendingUrl });
                  setPendingUrl(null);
                }
              }}
            >
              Leave Game
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showCompletionCarousel ? (
        <div className="mb-3 sm:mb-4">
          <CompletionMoreCrosswordPuzzlesCarousel
            excludeSlug={puzzleSlug ?? undefined}
            excludeId={puzzle.id}
          />
        </div>
      ) : null}

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
              render={
                <button className="mt-2 ml-3 align-middle outline-none hover:brightness-75" />
              }
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
            onClick={() => {
              void shareText(
                `${puzzle.title} - Padajāla`,
                get_general_share_msg(puzzle.title, puzzleSlug, puzzle.description),
                'Puzzle link copied to clipboard'
              );
            }}
            className="mt-2 ml-3 inline-flex items-center justify-center align-middle text-slate-500 outline-none hover:text-slate-700 hover:brightness-75 dark:text-slate-400 dark:hover:text-slate-200"
            title="Share Puzzle"
            aria-label="Share Puzzle"
          >
            <IoShareSocialOutline className="size-3.5 sm:size-4.5" />
          </button>
        ) : null}
      </motion.header>

      {showAccordion ? (
        <div className="mb-3 w-full sm:mb-4">
          <MoreCrosswordPuzzlesAccordion
            excludeSlug={puzzleSlug ?? undefined}
            excludeId={puzzle.id}
          />
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

        {/* Center: grid + keyboard + active clue + controls */}
        <div className="order-1 flex w-full flex-col items-center gap-1 sm:gap-4 lg:order-2 lg:col-span-6">
          <div
            ref={boardAnchorRef}
            className={cn(
              'relative w-full max-w-[min(100%,24rem)] lg:max-w-100 xl:max-w-104 2xl:max-w-108',
              // Reserve seam space for the floating toggle when the panel is closed.
              useVirtualKeyboard && started && !completed && !keyboardPanelOpen && 'pb-4'
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
                <GameControls game={game} onAfterStart={handleAfterStart} />
              </div>
            ) : null}
            {/* Toggle sits on the grid/keyboard seam so it doesn't add a gap row. */}
            {started && !completed ? (
              <div className="absolute right-1 bottom-0 z-20 translate-y-1/2 sm:right-0">
                <CrossWordOnScreenKeyboard
                  enabled={useVirtualKeyboard}
                  open={keyboardPanelOpen}
                  onOpenChange={setKeyboardOpen}
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
              onOpenChange={setKeyboardOpen}
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
              <GameControls game={game} onAfterStart={handleAfterStart} />
            </motion.div>
          ) : null}
        </div>

        {/* Desktop: clue list replaces the former game-help sidebar */}
        <div className="order-3 hidden min-w-0 lg:col-span-3 lg:block">
          <div
            className={cn('lg:sticky lg:top-4', started && !completed ? 'lg:-mt-16' : 'lg:-mt-10')}
          >
            <CluePanel game={game} moreHints={moreHints} className="max-h-[min(70vh,36rem)]" />
          </div>
        </div>
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
