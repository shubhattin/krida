'use client';

import { useEffect, useRef, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { IoShareSocialOutline } from 'react-icons/io5';
import { toast } from 'sonner';
import { CrossWordGrid } from './CrossWordGrid';
import { GameProgress } from './GameProgress';
import { GameControls } from './GameControls';
import { CompletionCelebration } from './CompletionCelebration';
import { CrossWordOnScreenKeyboard } from './CrossWordOnScreenKeyboard';
import { GameHelp } from './Help';
import { get_general_share_msg } from './share';
import {
  CompletionMoreCrosswordPuzzlesCarousel,
  getCrosswordCarouselPuzzlesQueryFn,
  MoreCrosswordPuzzlesAccordion
} from './MorePuzzlesCarousel';
import { useCrossWordGame } from './useCrossWordGame';
import { shouldAutoOpenOnScreenKeyboard } from './touch_device';
import {
  puzzle_atom,
  started_atom,
  completed_atom,
  active_entry_atom,
  pending_navigation_url_atom
} from './game_state';
import { cn } from '~/lib/utils';
import { copy_text_to_clipboard } from '~/tools/kry';
import type { Attachment } from '~/util/puzzle/attachments';
import type { location_list_type } from '~/db/types';
import { MediaAttachments } from '~/components/pages/puzzle/MediaAttachments';
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
import styles from './crossword-game.module.css';

function ActiveClueCard({ activeEntry }: { activeEntry: any }) {
  return (
    <div className="w-full max-w-[24rem] px-1 lg:max-w-md xl:max-w-120 2xl:max-w-lg">
      <div className="relative flex min-h-19 w-full flex-col justify-center rounded-2xl border border-border/40 bg-card/65 p-3 shadow-[0_4px_20px_oklch(0_0_0/0.04)] backdrop-blur-md transition-all duration-200 sm:min-h-22 sm:p-4 dark:shadow-[0_10px_35px_oklch(0_0_0/0.25)]">
        <AnimatePresence mode="wait">
          {activeEntry ? (
            <motion.div
              key={activeEntry.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-0.5 text-[0.65rem] font-bold tracking-wider text-primary uppercase dark:bg-primary/20">
                  <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                  {activeEntry.number} {activeEntry.direction}
                </span>
              </div>
              <p className="text-[0.95rem] leading-snug font-medium text-foreground/90">
                {activeEntry.clue}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center justify-center gap-1.5 py-1 text-center"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 animate-pulse text-violet-500 dark:text-violet-400" />
                <span className="bg-linear-to-r from-violet-600 to-indigo-600 bg-clip-text text-xs font-semibold tracking-wider text-transparent uppercase dark:from-violet-300 dark:to-indigo-300">
                  Ready to Solve
                </span>
              </div>
              <p className="text-[0.85rem] leading-snug font-medium text-foreground/80">
                Select a cell on the grid to reveal its clue
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

async function shareText(title: string, text: string, successToast: string) {
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
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
  const game = useCrossWordGame(timerRef);
  const puzzle = useAtomValue(puzzle_atom);
  const started = useAtomValue(started_atom);
  const completed = useAtomValue(completed_atom);
  const activeEntry = useAtomValue(active_entry_atom);
  const [pendingUrl, setPendingUrl] = useAtom(pending_navigation_url_atom);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const hasMedia = !!(attachments && attachments.length > 0);

  const showAccordion = !completed && (location === 'main_page' || location === 'view_page');
  const showCompletionCarousel = completed;

  useEffect(() => {
    if (!puzzle) return;
    queryClient.prefetchQuery({
      queryKey: ['crossword_listed_puzzles_carousel', puzzleSlug ?? undefined, puzzle.id],
      queryFn: getCrosswordCarouselPuzzlesQueryFn(puzzleSlug ?? undefined, puzzle.id)
    });
  }, [puzzle, puzzleSlug, queryClient]);

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
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Close the panel when the session ends or resets; never leave it open idle.
  useEffect(() => {
    if (!started || completed) {
      setKeyboardOpen(false);
    }
  }, [started, completed]);

  const handleAfterStart = () => {
    // Auto-open only on touch-capable devices (phones, tablets, touch laptops).
    // Desktop users keep a closed panel and can reveal it via the keyboard icon.
    if (shouldAutoOpenOnScreenKeyboard()) {
      setKeyboardOpen(true);
    }
  };

  // Physical keyboard input while the game is active.
  useEffect(() => {
    if (!started) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        game.handleKeyDown(event);
        return;
      }

      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      game.handleKeyDown(event);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [game.handleKeyDown, started]);

  // Click outside to deselect grid focus — keyboard panel buttons are excluded
  // via the generic `button` check so typing never clears selection.
  useEffect(() => {
    if (!started || completed) return;

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (target.closest('[role="grid"]')) return;
      if (target.closest('button')) return;
      if (target.closest('[data-crossword-onscreen-kb="true"]')) return;

      game.clearFocus();
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [game, started, completed]);

  if (!puzzle) return null;

  return (
    <div className="mx-auto w-full max-w-7xl px-2 py-6 sm:px-4 sm:py-8 md:px-6">
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
                  router.push(pendingUrl);
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
        className="mb-3 text-center sm:mb-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <h1
          className={`inline text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl ${styles.titleGradient}`}
        >
          {puzzle.title}
        </h1>
        {listed && puzzleSlug ? (
          <button
            type="button"
            onClick={() => {
              void shareText(
                `${puzzle.title} - Crossword`,
                get_general_share_msg(puzzle.title, puzzleSlug, puzzle.description),
                'Puzzle link copied to clipboard'
              );
            }}
            className="ml-3 inline-flex items-center justify-center align-middle text-slate-500 outline-none hover:text-slate-700 hover:brightness-75 dark:text-slate-400 dark:hover:text-slate-200"
            title="Share Puzzle"
            aria-label="Share Puzzle"
          >
            <IoShareSocialOutline className="size-3.5 sm:size-4.5" />
          </button>
        ) : null}
        {puzzle.description ? (
          <p className="mt-1.5 text-[0.85rem] tracking-wider text-muted-foreground">
            {puzzle.description}
          </p>
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

      {/* Mobile media (above progress); desktop media sits in the left column below. */}
      {hasMedia ? (
        <div className="mb-3 w-full max-w-md lg:hidden">
          <MediaAttachments attachments={attachments!} className="max-w-md" />
        </div>
      ) : null}

      <div className="mb-3 flex flex-col items-center gap-3 sm:mb-4">
        <GameProgress />
        <CompletionCelebration listed={listed} puzzleSlug={puzzleSlug} />
      </div>

      <div
        className={cn(
          'grid grid-cols-1 gap-y-4 sm:gap-y-5',
          'lg:grid-cols-12 lg:items-start lg:gap-x-4 xl:gap-x-5'
        )}
      >
        {/* Left: media (desktop) */}
        <div className={cn('order-2 hidden min-w-0 lg:order-1 lg:col-span-3 lg:block')}>
          {hasMedia ? (
            <div className="lg:sticky lg:top-6">
              <MediaAttachments attachments={attachments!} className="max-w-sm" />
            </div>
          ) : null}
        </div>

        {/* Center: grid + keyboard + active clue + controls */}
        <div className="order-1 flex w-full flex-col items-center gap-1 sm:gap-4 lg:order-2 lg:col-span-6">
          <div
            className={cn(
              'relative w-full max-w-[min(100%,24rem)] lg:max-w-md xl:max-w-120 2xl:max-w-lg',
              // Reserve seam space for the floating toggle when the panel is closed.
              started && !completed && !keyboardOpen && 'pb-4'
            )}
          >
            <CrossWordGrid game={game} />
            {!started ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/25 backdrop-blur-[2px]">
                <GameControls game={game} onAfterStart={handleAfterStart} />
              </div>
            ) : null}
            {/* Toggle sits on the grid/keyboard seam so it doesn't add a gap row. */}
            {started && !completed ? (
              <div className="absolute right-1 bottom-0 z-20 translate-y-1/2 sm:right-0">
                <CrossWordOnScreenKeyboard
                  open={keyboardOpen}
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
              open={keyboardOpen}
              onOpenChange={setKeyboardOpen}
              onTypeLetter={game.typeLetter}
              onBackspace={game.backspace}
              onToggleDirection={game.toggleDirection}
              canToggleDirection={game.canToggleDirection}
              panelOnly
            />
          ) : null}

          {started && !completed && <ActiveClueCard activeEntry={activeEntry} />}

          {started ? (
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

        {/* Right: compact game guide (desktop sticky; stacks below on mobile) */}
        <div className="order-3 lg:col-span-3">
          <div className="lg:sticky lg:top-6 lg:mt-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
              <GameHelp />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
