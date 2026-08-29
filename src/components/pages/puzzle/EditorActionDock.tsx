'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiSave } from 'react-icons/fi';
import { Redo2, Undo2 } from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '~/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';
import { useEditorHistoryActions, useEditorHistoryState } from '~/hooks/useEditorHistory';
import { useUnsavedChangesGuard } from '~/hooks/useUnsavedChangesGuard';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}

type EditorActionDockProps = {
  onSave: () => void;
  isSaving?: boolean;
  className?: string;
};

export function EditorActionDock({ onSave, isSaving = false, className }: EditorActionDockProps) {
  const { undo, redo } = useEditorHistoryActions();
  const { canUndo, canRedo, isDirty, changeCount } = useEditorHistoryState();

  useUnsavedChangesGuard(isDirty);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      const key = e.key.toLowerCase();
      if (key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }
      if (key === 'z') {
        e.preventDefault();
        undo();
        return;
      }
      if (key === 'y' && !e.metaKey) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  const modLabel = isMacPlatform() ? '⌘' : 'Ctrl';
  const statusLabel = !isDirty
    ? 'All changes saved'
    : changeCount > 0
      ? `${changeCount} unsaved change${changeCount === 1 ? '' : 's'}`
      : 'Unsaved changes';

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-3 pb-[env(safe-area-inset-bottom)]',
        className
      )}
    >
      <TooltipProvider delay={200}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className={cn(
            'border-border/70 pointer-events-auto flex max-w-full items-center gap-1.5 rounded-full border',
            'bg-card/95 px-2 py-1.5 shadow-lg backdrop-blur-md',
            'dark:border-white/10 dark:bg-slate-900/90'
          )}
        >
          <div className="flex min-w-0 items-center gap-2 px-2">
            <span
              className={cn(
                'size-2 shrink-0 rounded-full',
                isDirty ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'
              )}
              aria-hidden
            />
            <span className="text-muted-foreground truncate text-xs font-medium sm:text-sm">
              <span className="sm:hidden">
                {isDirty ? (changeCount > 0 ? String(changeCount) : '•') : '✓'}
              </span>
              <span className="hidden sm:inline">{statusLabel}</span>
            </span>
          </div>

          <div className="bg-border/80 h-5 w-px shrink-0" aria-hidden />

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  disabled={!canUndo}
                  onClick={() => undo()}
                  aria-label="Undo"
                  className="rounded-full"
                />
              }
            >
              <Undo2 className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="top">Undo ({modLabel}+Z)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  disabled={!canRedo}
                  onClick={() => redo()}
                  aria-label="Redo"
                  className="rounded-full"
                />
              }
            >
              <Redo2 className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="top">Redo ({modLabel}+Shift+Z)</TooltipContent>
          </Tooltip>

          <div className="bg-border/80 h-5 w-px shrink-0" aria-hidden />

          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!isDirty || isSaving}
                  className="gap-1.5 rounded-full px-3"
                  aria-label="Save changes"
                />
              }
            >
              <FiSave className="size-3.5" />
              <span className="hidden sm:inline">{isSaving ? 'Saving…' : 'Save'}</span>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Save</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to save your changes?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onSave}>Confirm</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </motion.div>
      </TooltipProvider>
    </div>
  );
}
