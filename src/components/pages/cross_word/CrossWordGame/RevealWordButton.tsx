'use client';

import { useState } from 'react';
import { Eye } from 'lucide-react';
import { Button } from '~/components/ui/button';
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
import { cn } from '~/lib/utils';
import { MAX_WORD_REVEALS } from './game_state';

type RevealWordButtonProps = {
  revealsLeft: number;
  /** True while a reveal animation is in flight. */
  busy: boolean;
  /** Focused, unsolved entry id — null when reveal isn't available. */
  entryId: string | null;
  onReveal: (entryId: string) => void;
  className?: string;
};

/** Progress-row lifeline — reveals the currently selected crossword word. */
export function RevealWordButton({
  revealsLeft,
  busy,
  entryId,
  onReveal,
  className
}: RevealWordButtonProps) {
  const [open, setOpen] = useState(false);
  /** Snapshot so a backdrop click can't clear focus before Confirm. */
  const [pendingEntryId, setPendingEntryId] = useState<string | null>(null);
  const spent = revealsLeft <= 0;
  const canReveal = !!entryId;
  const disabled = spent || busy || !canReveal;

  const title = spent
    ? 'No reveals left'
    : busy
      ? 'Revealing…'
      : !canReveal
        ? 'Select a word to reveal'
        : `Reveal selected word (${revealsLeft} of ${MAX_WORD_REVEALS} left)`;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={disabled}
        onClick={() => {
          if (!entryId) return;
          setPendingEntryId(entryId);
          setOpen(true);
        }}
        aria-label={title}
        title={title}
        className={cn(
          'h-8 gap-1 rounded-full border px-2.5 font-semibold tabular-nums shadow-sm backdrop-blur-md',
          'border-amber-500/30 bg-linear-to-r from-orange-50/90 to-amber-50/80 text-amber-800',
          'hover:from-orange-100 hover:to-amber-100 hover:text-amber-900',
          'dark:border-amber-400/35 dark:from-orange-950/70 dark:to-amber-950/60 dark:text-amber-200',
          'dark:hover:from-orange-900/80 dark:hover:to-amber-900/70 dark:hover:text-amber-100',
          'disabled:pointer-events-none disabled:opacity-40',
          className
        )}
      >
        <Eye className="size-3.5 shrink-0" />
        <span className="text-[0.7rem] leading-none">
          {spent ? '0' : revealsLeft}/{MAX_WORD_REVEALS}
        </span>
      </Button>

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setPendingEntryId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reveal this word?</AlertDialogTitle>
            <AlertDialogDescription>
              This uses 1 of your {MAX_WORD_REVEALS} reveals for this session. The selected word
              will be filled in for you.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                'bg-linear-to-r from-orange-600 to-amber-700 text-white',
                'hover:from-orange-500 hover:to-amber-600',
                'dark:from-orange-700 dark:to-amber-800 dark:hover:from-orange-600 dark:hover:to-amber-700'
              )}
              onClick={() => {
                if (pendingEntryId) onReveal(pendingEntryId);
                setPendingEntryId(null);
                setOpen(false);
              }}
            >
              Reveal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
