'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
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

type ResetPuzzleButtonProps = {
  onReset: () => void;
  className?: string;
};

/** Floating reset control — sits above the board, away from the timer row. */
export function ResetPuzzleButton({ onReset, className }: ResetPuzzleButtonProps) {
  const [open, setOpen] = useState(false);
  const skipConfirm = import.meta.env.DEV;

  return (
    <>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={() => {
          if (skipConfirm) {
            onReset();
            return;
          }
          setOpen(true);
        }}
        aria-label="Reset puzzle"
        title="Reset"
        className={cn(
          'rounded-full border border-red-500/25 bg-card/80 text-red-500 shadow-sm backdrop-blur-md',
          'hover:bg-red-500/10 hover:text-red-600',
          'dark:border-red-400/30 dark:bg-slate-900/70 dark:text-red-400 dark:hover:bg-red-500/15 dark:hover:text-red-300',
          className
        )}
      >
        <RotateCcw className="size-3.5" />
      </Button>

      {!skipConfirm ? (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset this puzzle?</AlertDialogTitle>
              <AlertDialogDescription>
                Your current crossword progress will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500"
                onClick={() => {
                  onReset();
                  setOpen(false);
                }}
              >
                Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  );
}
