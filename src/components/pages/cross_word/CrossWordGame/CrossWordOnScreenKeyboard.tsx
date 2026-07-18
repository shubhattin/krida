'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeftRight, Delete, Keyboard, X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';
import styles from './crossword-game.module.css';

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
  /**
   * Feature gate for the in-app virtual keyboard experiment.
   * When false, renders nothing (neither the floating toggle nor the key panel).
   * Defaults to true so callers that omit it keep the shipped custom-keyboard UX.
   */
  enabled?: boolean;
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
  accent,
  muted,
  children
}: {
  label?: string;
  ariaLabel: string;
  onClick: () => void;
  disabled?: boolean;
  wide?: boolean;
  accent?: boolean;
  muted?: boolean;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={(event) => {
        // Keep focus off keys so physical keyboard + grid selection stay stable.
        event.currentTarget.blur();
        onClick();
      }}
      onPointerDown={(event) => {
        if (disabled) return;
        const target = event.currentTarget;
        const ripple = target.querySelector<HTMLElement>('[data-key-ripple="true"]');
        if (!ripple) return;

        const rect = target.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 1.15;
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        ripple.getAnimations().forEach((a) => a.cancel());
        ripple.animate(
          [
            { transform: 'scale(0.15)', opacity: '0.55' },
            { transform: 'scale(1)', opacity: '0' }
          ],
          { duration: 420, easing: 'ease-out', fill: 'forwards' }
        );
      }}
      className={cn(
        styles.kbKey,
        wide && styles.kbKeyWide,
        accent && styles.kbKeyAccent,
        muted && styles.kbKeyMuted
      )}
    >
      <span aria-hidden className={styles.kbKeyFlash} />
      <span aria-hidden data-key-ripple="true" className={styles.kbKeyRipple} />
      <span className={styles.kbKeyLabel}>{children ?? label}</span>
    </button>
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
              'rounded-full border-border/60 bg-card/95 text-foreground shadow-[0_2px_8px_oklch(0_0_0/0.12),0_1px_0_oklch(1_0_0/0.6)_inset] backdrop-blur-sm transition-all duration-150',
              'hover:bg-muted/80 hover:shadow-[0_4px_12px_oklch(0_0_0/0.16),0_1px_0_oklch(1_0_0/0.5)_inset]',
              'active:translate-y-px active:shadow-[inset_0_1px_3px_oklch(0_0_0/0.15)]',
              // Dark: elevated slate chip so the toggle stays visible on the navy game shell
              'dark:border-white/15 dark:bg-slate-800/95 dark:text-slate-100',
              'dark:shadow-[0_4px_14px_oklch(0_0_0/0.55),0_1px_0_oklch(1_0_0/0.1)_inset]',
              'dark:hover:border-white/25 dark:hover:bg-slate-700 dark:hover:text-white',
              'dark:active:shadow-[inset_0_1px_4px_oklch(0_0_0/0.45)]',
              open &&
                'ring-2 ring-primary/40 dark:border-primary/45 dark:bg-slate-700 dark:text-white dark:ring-primary/55 dark:hover:bg-slate-600'
            )}
          />
        }
      >
        <Keyboard />
      </TooltipTrigger>
      {/* Override inverted tooltip tokens so dark mode stays dark (not light-on-dark). */}
      <TooltipContent
        side="top"
        className={cn(
          'dark:border dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 dark:shadow-lg',
          'dark:[&>*:last-child]:bg-slate-800 dark:[&>*:last-child]:fill-slate-800'
        )}
      >
        {open ? 'Hide keyboard' : 'Show keyboard'}
      </TooltipContent>
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
  enabled = true,
  toggleOnly = false,
  panelOnly = false
}: CrossWordOnScreenKeyboardProps) {
  // Experimentation: when the native-input path is active, hide both the toggle
  // and the QWERTY panel entirely so players only use the OS soft keyboard.
  if (!enabled) return null;

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
                      accent={canToggleDirection}
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

                    <KeyButton ariaLabel="Delete letter" onClick={onBackspace} wide muted>
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
