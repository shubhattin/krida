'use client';

import type { PointerEvent, ReactNode } from 'react';
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

/**
 * Shared keycap styling. Light theme leans on crisp borders + soft drop shadows
 * for depth; dark theme keeps the same shadow language but lifts the contrast
 * so keys stay legible and tactile against the deep navy panel.
 */
const KEY_BASE =
  'group/key h-10 min-w-0 flex-1 touch-manipulation rounded-xl px-0 text-[0.95rem] font-bold tracking-wide select-none';
const KEY_LIGHT =
  'border border-border/70 bg-linear-to-b from-white to-muted/50 text-foreground ' +
  'shadow-[0_1px_0_oklch(1_0_0/0.9)_inset,0_1px_2px_oklch(0_0_0/0.08),0_4px_8px_-3px_oklch(0_0_0/0.12)] ' +
  'hover:from-muted/40 hover:to-muted/70 hover:shadow-[0_1px_0_oklch(1_0_0/0.8)_inset,0_2px_4px_oklch(0_0_0/0.1),0_6px_12px_-4px_oklch(0_0_0/0.16)]';
const KEY_DARK =
  'dark:border-white/10 dark:from-white/7 dark:to-white/2 dark:text-foreground ' +
  'dark:shadow-[0_1px_0_oklch(1_0_0/0.08)_inset,0_1px_2px_oklch(0_0_0/0.4),0_6px_14px_-4px_oklch(0_0_0/0.6)] ' +
  'dark:hover:from-white/12 dark:hover:to-white/4 dark:hover:shadow-[0_1px_0_oklch(1_0_0/0.1)_inset,0_2px_5px_oklch(0_0_0/0.45),0_8px_18px_-4px_oklch(0_0_0/0.7)]';
// Pressed state: key sinks slightly, loses its drop shadow, gains an inner glow.
const KEY_PRESSED =
  'active:translate-y-[1.5px] active:scale-[0.97] active:shadow-[inset_0_2px_5px_oklch(0_0_0/0.18)] ' +
  'dark:active:shadow-[inset_0_2px_6px_oklch(0_0_0/0.6)] active:transition-[transform,box-shadow] active:duration-75';

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
      onPointerDown={(event) => {
        const target = event.currentTarget;
        const ripple = target.querySelector<HTMLElement>('[data-key-ripple="true"]');
        if (!ripple) return;

        const rect = target.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 1.1;
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        // Reset then re-trigger the ripple animation from the press point.
        ripple.style.opacity = '0';
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        // Force reflow so the restart is picked up.
        void ripple.offsetWidth;
        ripple.animate(
          [
            { transform: 'scale(0.2)', opacity: '0.5' },
            { transform: 'scale(1)', opacity: '0' }
          ],
          { duration: 450, easing: 'ease-out', fill: 'forwards' }
        );
      }}
      className={cn(
        KEY_BASE,
        KEY_LIGHT,
        KEY_DARK,
        KEY_PRESSED,
        'group/key relative overflow-hidden transition-[transform,box-shadow,background-color] duration-150 ease-out',
        wide && 'max-w-17 flex-[1.35]',
        className
      )}
    >
      {/* Flash overlay: a quick white wash on press for tactile feedback. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] bg-primary opacity-0 transition-opacity duration-100 group-active/key:opacity-15 dark:group-active/key:opacity-25"
      />
      {/* Ripple: expands from the press point. Spawned via JS on pointer down. */}
      <span
        aria-hidden="true"
        data-key-ripple="true"
        className="pointer-events-none absolute rounded-full bg-primary/30 opacity-0"
      />
      <span className="relative z-10">{children ?? label}</span>
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
              'rounded-full border-border/60 bg-card/95 shadow-[0_2px_8px_oklch(0_0_0/0.12),0_1px_0_oklch(1_0_0/0.6)_inset] backdrop-blur-sm transition-all duration-150',
              'hover:shadow-[0_4px_12px_oklch(0_0_0/0.16),0_1px_0_oklch(1_0_0/0.5)_inset]',
              'active:translate-y-px active:shadow-[inset_0_1px_3px_oklch(0_0_0/0.15)]',
              'dark:border-white/10 dark:bg-card/80 dark:shadow-[0_4px_14px_oklch(0_0_0/0.5),0_1px_0_oklch(1_0_0/0.08)_inset]',
              open && 'ring-2 ring-primary/40 dark:ring-primary/50'
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
      <div className="flex w-full max-w-[24rem] flex-col items-center lg:max-w-100 xl:max-w-104 2xl:max-w-108">
        {!panelOnly ? (
          <div className="mb-1 flex w-full items-center justify-end px-1 sm:mb-2">
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
                  'relative flex w-full flex-col gap-1.5 rounded-2xl border p-2 sm:gap-2 sm:p-3',
                  'border-border/60',
                  'bg-linear-to-br from-card/95 via-card/75 to-primary/6',
                  'shadow-[0_10px_30px_-6px_oklch(0_0_0/0.12),0_1px_0_oklch(1_0_0/0.6)_inset]',
                  'backdrop-blur-md',
                  'dark:border-white/10 dark:from-white/6 dark:via-card/60 dark:to-primary/12',
                  'dark:shadow-[0_20px_50px_-10px_oklch(0_0_0/0.65),0_1px_0_oklch(1_0_0/0.07)_inset]',
                  'ring-1 ring-primary/10 dark:ring-primary/25'
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
                          'border-primary/40 text-primary dark:border-primary/50'
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
