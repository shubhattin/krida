'use client';

import { useState } from 'react';
import { AlertCircle, BookOpen, RefreshCw, Sparkles, WandSparkles } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '~/components/ui/accordion';
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

type PreviewQuery = {
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => Promise<object>;
};

/**
 * Admin edit-page shell for stored AI puzzle content (word meanings, more hints): collapsed by
 * default so long lists don't dominate the page, with refresh, paid regenerate and error states.
 */
export function AiContentPreview({
  title,
  label,
  count,
  countNoun,
  description,
  query,
  onRefresh,
  onRegenerate,
  isRegenerating,
  emptyText,
  children
}: {
  title: string;
  /** Lowercase plural used in messages, e.g. "word meanings" */
  label: string;
  count: number | undefined;
  /** Singular noun for the count chip, e.g. "word" */
  countNoun: string;
  description: React.ReactNode;
  query: PreviewQuery;
  onRefresh: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  /** Shown instead of the list when set */
  emptyText: string | null;
  /** List items */
  children: React.ReactNode;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const busy = query.isFetching || isRegenerating;

  const statusLabel = query.isLoading
    ? 'loading…'
    : query.error
      ? 'failed to load'
      : count !== undefined
        ? `${count} ${count === 1 ? countNoun : `${countNoun}s`}`
        : null;

  return (
    <Accordion>
      <AccordionItem value="ai-content" className="rounded-lg border px-3">
        <AccordionTrigger className="py-2.5 hover:no-underline">
          <span className="flex min-w-0 items-center gap-2">
            <BookOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="text-sm font-semibold">{title}</span>
            <span
              title="AI-generated — may contain errors"
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-600 dark:bg-violet-900/40 dark:text-violet-300"
            >
              <Sparkles className="size-2.5" aria-hidden />
              AI
            </span>
            {statusLabel ? (
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {statusLabel}
              </span>
            ) : null}
          </span>
        </AccordionTrigger>

        <AccordionContent>
          <p className="text-xs text-muted-foreground">{description}</p>

          <div className="mt-2 mb-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={busy}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium',
                'text-muted-foreground hover:bg-muted disabled:cursor-wait disabled:opacity-60'
              )}
            >
              <RefreshCw
                className={cn('size-3.5', query.isFetching && 'animate-spin')}
                aria-hidden
              />
              {query.isFetching ? 'Loading…' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={busy}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium',
                'text-violet-600 hover:bg-violet-50 disabled:cursor-wait disabled:opacity-60',
                'dark:text-violet-300 dark:hover:bg-violet-900/30'
              )}
            >
              <WandSparkles
                className={cn('size-3.5', isRegenerating && 'animate-pulse')}
                aria-hidden
              />
              {isRegenerating ? 'Regenerating…' : 'Regenerate'}
            </button>
          </div>

          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Regenerate {label}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This runs a new (paid) AI generation and replaces the saved {label} for every
                  player.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onRegenerate}>Regenerate</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {query.isLoading ? (
            <div className="flex flex-col gap-1.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-lg border px-3 py-2.5">
                  <div className="mb-1.5 h-3.5 w-1/4 rounded bg-muted" />
                  <div className="h-3 w-4/5 rounded bg-muted/70" />
                </div>
              ))}
            </div>
          ) : query.error ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-3 py-5 text-center">
              <div className="flex size-9 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
                <AlertCircle className="size-4 text-rose-500 dark:text-rose-400" aria-hidden />
              </div>
              <p className="text-xs font-semibold">
                {query.isFetching ? 'Retrying AI generation…' : `Failed to load ${label}`}
              </p>
              <p className="max-w-xs text-[11px] text-muted-foreground">
                After a failed generation the server waits 15 minutes before trying again on its own
                — use Regenerate to retry right away.
              </p>
              <button
                type="button"
                onClick={() => void query.refetch()}
                disabled={busy}
                className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-60"
              >
                {query.isFetching ? 'Retrying…' : 'Retry'}
              </button>
            </div>
          ) : emptyText ? (
            <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
              {emptyText}
            </p>
          ) : (
            <ul className="grid max-h-[420px] grid-cols-1 gap-1.5 overflow-y-auto pr-0.5 sm:grid-cols-2">
              {children}
            </ul>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
