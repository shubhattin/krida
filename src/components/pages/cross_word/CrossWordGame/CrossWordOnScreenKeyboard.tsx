'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeftRight, Delete, Keyboard, X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';

const ROW_1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'] as const;
const ROW_2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'] as const;
const ROW_3 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M'] as const;

type CrossWordOnScreenKeyboardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTypeLetter: (letter: string) => void;
  onBackspace: () => void;
  onToggleDirection: () => void;
  canToggleDirection: boolean;
  /** When true, only the floating toggle is rendered (parent places it on the grid seam). */
  toggleOnly?: boolean;
  /** When true, only the expandable key panel is rendered (no duplicate toggle row). */
  panelOnly?: boolean;
};

function KeyButton({
  label,
  ariaLabel,
  onClick,
  disabled,
  wide,
  className,
  children
}: {
  label?: string;
  ariaLabel: string;
  onClick: () => void;
  disabled?: boolean;
  wide?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={(event) => {
        // Keep focus off keys so physical keyboard + grid selection stay stable.
        event.currentTarget.blur();
        onClick();
      }}
      className={cn(
        'h-10 min-w-0 flex-1 touch-manipulation rounded-xl border-border/50 bg-gradient-to-b from-background to-muted/40 px-0 text-[0.95rem] font-bold tracking-wide text-foreground shadow-[0_1px_0_oklch(1_0_0/0.55)_inset,0_2px_6px_oklch(0_0_0/0.06)] transition-[transform,box-shadow,background-color] duration-150',
        'hover:from-muted/30 hover:to-muted/60 hover:shadow-[0_1px_0_oklch(1_0_0/0.4)_inset,0_3px_10px_oklch(0_0_0/0.1)]',
        'active:translate-y-px active:shadow-none',
        'dark:border-border/40 dark:from-card/80 dark:to-muted/30 dark:shadow-[0_1px_0_oklch(1_0_0/0.08)_inset,0_4px_12px_oklch(0_0_0/0.35)]',
        'dark:hover:from-muted/40 dark:hover:to-muted/50',
        wide && 'max-w-[4.25rem] flex-[1.35]',
        className
      )}
    >
      {children ?? label}
    </Button>
  );
}

function KeyboardToggle({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant={open ? 'secondary' : 'outline'}
            aria-label={open ? 'Hide on-screen keyboard' : 'Show on-screen keyboard'}
            aria-pressed={open}
            onClick={() => onOpenChange(!open)}
            className={cn(
              'rounded-full border-border/50 bg-card/90 shadow-md backdrop-blur-sm',
              open && 'ring-2 ring-primary/25'
            )}
          />
        }
      >
        <Keyboard />
      </TooltipTrigger>
      <TooltipContent side="top">{open ? 'Hide keyboard' : 'Show keyboard'}</TooltipContent>
    </Tooltip>
  );
}

export function CrossWordOnScreenKeyboard({
  open,
  onOpenChange,
  onTypeLetter,
  onBackspace,
  onToggleDirection,
  canToggleDirection,
  toggleOnly = false,
  panelOnly = false
}: CrossWordOnScreenKeyboardProps) {
  if (toggleOnly) {
    return (
      <TooltipProvider>
        <KeyboardToggle open={open} onOpenChange={onOpenChange} />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex w-full max-w-[24rem] flex-col items-center">
        {!panelOnly ? (
          <div className="mb-1.5 flex w-full items-center justify-end px-1 sm:mb-2.5">
            <KeyboardToggle open={open} onOpenChange={onOpenChange} />
          </div>
        ) : null}

        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              key="onscreen-keyboard"
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -6, height: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="w-full overflow-hidden"
              // In-flow panel: outside presses must NOT dismiss it — only the
              // toggle or the close button may close it.
              data-crossword-onscreen-kb="true"
            >
              <div
                className={cn(
                  'relative flex w-full flex-col gap-1.5 rounded-2xl border border-border/45 p-2 sm:gap-2 sm:p-3',
                  'bg-gradient-to-br from-card/90 via-card/70 to-primary/5',
                  'shadow-[0_8px_28px_oklch(0_0_0/0.08),0_1px_0_oklch(1_0_0/0.5)_inset]',
                  'backdrop-blur-md dark:from-card/80 dark:via-card/55 dark:to-primary/10',
                  'dark:shadow-[0_16px_40px_oklch(0_0_0/0.4),0_1px_0_oklch(1_0_0/0.06)_inset]',
                  'ring-1 ring-primary/10 dark:ring-primary/20'
                )}
              >
                {/* Close floats in the corner so we don't reserve a full header row. */}
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label="Close on-screen keyboard"
                  onClick={() => onOpenChange(false)}
                  className="absolute top-1 right-1 z-10 rounded-full bg-card/70 text-muted-foreground backdrop-blur-sm hover:text-foreground"
                >
                  <X />
                </Button>

                <div className="flex flex-col gap-1 sm:gap-1.5">
                  <div className="flex gap-1 pr-6">
                    {ROW_1.map((letter) => (
                      <KeyButton
                        key={letter}
                        label={letter}
                        ariaLabel={`Letter ${letter}`}
                        onClick={() => onTypeLetter(letter)}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1 px-1.5 sm:px-3">
                    {ROW_2.map((letter) => (
                      <KeyButton
                        key={letter}
                        label={letter}
                        ariaLabel={`Letter ${letter}`}
                        onClick={() => onTypeLetter(letter)}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <KeyButton
                      ariaLabel={
                        canToggleDirection
                          ? 'Switch word direction'
                          : 'Switch direction (available at Across/Down intersections)'
                      }
                      onClick={onToggleDirection}
                      disabled={!canToggleDirection}
                      wide
                      className={cn(
                        canToggleDirection &&
                          'border-primary/35 text-primary dark:border-primary/45'
                      )}
                    >
                      <ArrowLeftRight />
                    </KeyButton>

                    {ROW_3.map((letter) => (
                      <KeyButton
                        key={letter}
                        label={letter}
                        ariaLabel={`Letter ${letter}`}
                        onClick={() => onTypeLetter(letter)}
                      />
                    ))}

                    <KeyButton
                      ariaLabel="Delete letter"
                      onClick={onBackspace}
                      wide
                      className="text-muted-foreground"
                    >
                      <Delete />
                    </KeyButton>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}
