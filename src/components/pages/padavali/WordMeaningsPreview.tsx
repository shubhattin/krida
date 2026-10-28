'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, BookOpen, RefreshCw, Sparkles, WandSparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useTRPC } from '~/api/client';
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

/**
 * Admin preview of the stored AI word meanings for a padavali puzzle.
 * Collapsed by default so a long word list doesn't dominate the edit page.
 * Meanings are saved in the DB; the backend clears and regenerates them on save
 * when the title, description or active words change. Regenerate forces a new run.
 */
export function PadavaliWordMeaningsPreview({
  puzzleId,
  slug
}: {
  puzzleId: number;
  slug: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const query = useQuery(
    trpc.public_ai.get_puzzle_word_meanings.queryOptions(
      { puzzle_id: puzzleId, puzzle_slug: slug },
      { staleTime: Infinity, retry: 2, refetchOnWindowFocus: false }
    )
  );

  const queryKey = trpc.public_ai.get_puzzle_word_meanings.queryKey({
    puzzle_id: puzzleId,
    puzzle_slug: slug
  });

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey });
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const regenerate_mut = useMutation(
    trpc.admin_ai_content.regenerate_word_meanings.mutationOptions({
      onSuccess(data) {
        queryClient.setQueryData(queryKey, data);
        toast.success('Word meanings regenerated');
      },
      onError() {
        toast.error('Failed to regenerate word meanings');
      },
      onSettled() {
        setConfirmOpen(false);
      }
    })
  );
  const busy = query.isFetching || regenerate_mut.isPending;

  const count = query.data?.words.length;
  const statusLabel = query.isLoading
    ? 'loading…'
    : query.error
      ? 'failed to load'
      : count !== undefined
        ? `${count} ${count === 1 ? 'word' : 'words'}`
        : null;

  return (
    <Accordion>
      <AccordionItem value="ai-word-meanings" className="rounded-lg border px-3">
        <AccordionTrigger className="py-2.5 hover:no-underline">
          <span className="flex min-w-0 items-center gap-2">
            <BookOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="text-sm font-semibold">AI Word Meanings</span>
            <span
              title="AI-generated explanations — may contain errors"
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
          <p className="text-xs text-muted-foreground">
            Saved meanings used in-game for hints &amp; word explanations. They regenerate
            automatically on save when the title, description or words change; use Regenerate to
            replace them with a fresh AI run.
          </p>

          <div className="mt-2 mb-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleRefresh}
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
                className={cn('size-3.5', regenerate_mut.isPending && 'animate-pulse')}
                aria-hidden
              />
              {regenerate_mut.isPending ? 'Regenerating…' : 'Regenerate'}
            </button>
          </div>

          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Regenerate word meanings?</AlertDialogTitle>
                <AlertDialogDescription>
                  This runs a new (paid) AI generation and replaces the saved meanings for every
                  player.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={regenerate_mut.isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={regenerate_mut.isPending}
                  onClick={() => regenerate_mut.mutate({ puzzle_id: puzzleId })}
                >
                  {regenerate_mut.isPending ? 'Regenerating…' : 'Regenerate'}
                </AlertDialogAction>
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
                <AlertCircle className="size-4 text-rose-500 dark:text-rose-400" />
              </div>
              <p className="text-xs font-semibold">
                {query.isFetching ? 'Retrying AI generation…' : 'Failed to load word meanings'}
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
          ) : !query.data?.words || query.data.words.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
              No meanings yet — add words and save the puzzle to generate them.
            </p>
          ) : (
            <ul className="grid max-h-[420px] grid-cols-1 gap-1.5 overflow-y-auto pr-0.5 sm:grid-cols-2">
              {query.data.words.map((item, idx) => (
                <li key={`${item.word}-${idx}`} className="rounded-lg border bg-muted/30 px-3 py-2">
                  <p className="flex items-baseline gap-2 text-xs font-semibold">
                    <span className="shrink-0 text-muted-foreground tabular-nums">{idx + 1}.</span>
                    <span>{item.word}</span>
                  </p>
                  <p className="mt-0.5 pl-5 text-xs leading-relaxed text-muted-foreground">
                    {item.meaning}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
