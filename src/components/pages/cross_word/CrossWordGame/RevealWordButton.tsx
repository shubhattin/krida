'use client';

import { Eye } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

type RevealWordButtonProps = {
  /** True while a reveal animation is in flight. */
  busy: boolean;
  /** Focused, unsolved entry id — null when reveal isn't available. */
  entryId: string | null;
  onReveal: (entryId: string) => void;
  className?: string;
};

/** Progress-row lifeline — reveals the next letter of the selected word. */
export function RevealWordButton({ busy, entryId, onReveal, className }: RevealWordButtonProps) {
  const canReveal = !!entryId;
  const disabled = busy || !canReveal;

  const title = busy ? 'Revealing…' : !canReveal ? 'Select a word to reveal' : 'Reveal next letter';

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={disabled}
      onClick={() => {
        if (!entryId) return;
        onReveal(entryId);
      }}
      aria-label={title}
      title={title}
      className={cn(
        'h-8 gap-1 rounded-full border px-2.5 font-semibold shadow-sm backdrop-blur-md',
        'border-amber-500/30 bg-linear-to-r from-orange-50/90 to-amber-50/80 text-amber-800',
        'hover:from-orange-100 hover:to-amber-100 hover:text-amber-900',
        'dark:border-amber-400/35 dark:from-orange-950/70 dark:to-amber-950/60 dark:text-amber-200',
        'dark:hover:from-orange-900/80 dark:hover:to-amber-900/70 dark:hover:text-amber-100',
        'disabled:pointer-events-none disabled:opacity-40',
        className
      )}
    >
      <Eye className="size-3.5 shrink-0" />
      <span className="text-[0.7rem] leading-none">Reveal</span>
    </Button>
  );
}
