'use client';

import { useContext, useState, type RefObject } from 'react';
import { motion } from 'framer-motion';
import { useAtom } from 'jotai';
import { BookOpen, Lightbulb } from 'lucide-react';
import { FaPlay } from 'react-icons/fa';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '~/components/ui/dialog';
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
import { Button } from '~/components/ui/button';
import { AppContext } from '~/components/AppDataContext';
import { FONT_INFO } from '~/state/script_font_data';
import { cn } from '~/lib/utils';
import {
  completed_atom,
  description_current_atom,
  practice_mode_atom,
  started_atom,
  title_current_atom,
  word_msgs_atom
} from './game_state';
import { useWordMeanings } from './useWordMeanings';
import { WordMeaningsPanel } from './AIWordExplanations';
import { useStartPuzzleGame } from './useStartPuzzleGame';

type Props = {
  puzzle_id: number;
  puzzle_slug: string;
  timerRef: RefObject<NodeJS.Timeout | null>;
};

export function HintDialog({ puzzle_id, puzzle_slug, timerRef }: Props) {
  const { script } = useContext(AppContext);
  const [open, setOpen] = useState(false);
  const [confirmRevealOpen, setConfirmRevealOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [title] = useAtom(title_current_atom);
  const [description] = useAtom(description_current_atom);
  const [wordMsgs] = useAtom(word_msgs_atom);
  const [started] = useAtom(started_atom);
  const [completed] = useAtom(completed_atom);
  const [practiceMode, setPracticeMode] = useAtom(practice_mode_atom);
  const startGame = useStartPuzzleGame(timerRef);
  const meanings = useWordMeanings(puzzle_id, puzzle_slug);
  const font_info = FONT_INFO[script!];

  const showMeanings = revealed || practiceMode;

  const revealMeanings = () => {
    setPracticeMode(true);
    setRevealed(true);
  };

  const handleRevealClick = () => {
    if (started && !completed) {
      setConfirmRevealOpen(true);
      return;
    }
    revealMeanings();
  };

  const handlePlay = () => {
    setOpen(false);
    if (!started) {
      startGame();
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setRevealed(practiceMode);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger
          render={
            <motion.button
              type="button"
              aria-label="Open hint and word meanings"
              animate={{ scale: [1, 0.92, 1.07, 1] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
              className={cn(
                'relative inline-flex items-center gap-1.5 overflow-hidden rounded-full px-3.5 py-1.5',
                'border border-orange-400/70 bg-linear-to-r from-orange-500 via-amber-600 to-orange-600',
                'text-sm font-semibold text-white shadow-md shadow-orange-500/35',
                'transition-all hover:brightness-110 active:scale-90',
                'dark:border-orange-500/50 dark:shadow-orange-600/25'
              )}
            />
          }
        >
          <Lightbulb className="size-5 shrink-0" />
          <span>Hint</span>
          <span className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-white/25 to-transparent" />
        </DialogTrigger>

        <DialogContent className="max-h-[min(90vh,640px)] gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="gap-2 border-b border-border px-4 pt-4 pb-3 sm:px-5">
            <DialogTitle className={cn('text-lg leading-snug', font_info.className)}>
              {title}
            </DialogTitle>
            {description ? (
              <DialogDescription className={cn('text-sm text-foreground/80', font_info.className)}>
                {description}
              </DialogDescription>
            ) : null}
            <p className="text-xs leading-relaxed text-muted-foreground">
              Use this as practice, then try again without hints.
            </p>
          </DialogHeader>

          <div className="flex flex-col gap-3 overflow-y-auto px-4 py-3 sm:px-5">
            {!showMeanings ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Reveal words and meanings to learn before you play.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRevealClick}
                  className="border-amber-300/80 bg-amber-50/80 text-amber-900 hover:bg-amber-100 dark:border-amber-600/40 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/60"
                >
                  <BookOpen data-icon="inline-start" className="size-4" />
                  Reveal Words &amp; Meanings
                </Button>
              </div>
            ) : (
              <>
                <p className="rounded-lg bg-amber-50/80 px-3 py-2 text-center text-xs leading-relaxed text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                  Explore Word Meanings — Continue when you're ready.
                </p>
                <WordMeaningsPanel
                  meanings={meanings}
                  openSections={['ai-meanings']}
                  onOpenSectionsChange={() => {}}
                  practiceMode
                  compact
                  defaultOpen
                  tone="warm"
                  showAiBadge={false}
                />
              </>
            )}
          </div>

          {showMeanings ? (
            <DialogFooter className="flex justify-center border-t border-border px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={handlePlay}
                className={cn(
                  'inline-flex items-center justify-center gap-2 overflow-hidden',
                  'bg-linear-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600',
                  'dark:from-blue-700 dark:to-indigo-700 dark:hover:from-blue-800 dark:hover:to-indigo-800',
                  'rounded-xl px-5 py-2.5 font-bold text-white shadow-lg',
                  'transform transition-all duration-200 hover:scale-105 active:scale-95',
                  font_info.className
                )}
              >
                <FaPlay className="size-4 text-white" />
                <span>{wordMsgs.play}</span>
              </button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmRevealOpen} onOpenChange={setConfirmRevealOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reveal meanings while playing?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;re doing well — see how far you can go on your own first. Reveal only if you
              really need a nudge.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep playing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                revealMeanings();
                setConfirmRevealOpen(false);
              }}
            >
              Reveal meanings
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
