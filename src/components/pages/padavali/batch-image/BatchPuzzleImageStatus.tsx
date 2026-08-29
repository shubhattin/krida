'use client';

import { Link } from '@tanstack/react-router';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '~/components/ui/button';
import { Spinner } from '~/components/ui/spinner';
import { Badge } from '~/components/ui/badge';
import type { AppRouter } from '~/api/trpc_router';
import type { inferRouterOutputs } from '@trpc/server';
import {
  PUZZLE_IMAGE_BATCH_STATUS_LABELS,
  PUZZLE_IMAGE_BATCH_STATUS_VARIANTS
} from '~/util/ai_batch/batch_image_status';

type RouterOutput = inferRouterOutputs<AppRouter>;
export type PuzzleImageBatchStatus = NonNullable<
  RouterOutput['batch_ai']['get_puzzle_image_batch_status']
>;

type BatchPuzzleImageStatusProps = {
  status: PuzzleImageBatchStatus;
  onRefresh: () => void;
  isRefreshing?: boolean;
  showBatchManagerLink?: boolean;
  /** Which game's batch manager to link to. Defaults to padavali. */
  game?: 'padavali' | 'crossword';
  className?: string;
};

function getStatusMessage(status: PuzzleImageBatchStatus['status']) {
  switch (status) {
    case 'processing':
      return 'Image generation is processing in the background.';
    case 'ready_for_review':
      return 'A generated image is ready for review.';
    case 'auto_applying':
      return 'Generated image will be applied to the puzzle automatically.';
    case 'failed':
      return 'Background image generation failed.';
  }
}

export function BatchPuzzleImageStatus({
  status,
  onRefresh,
  isRefreshing,
  showBatchManagerLink = true,
  game = 'padavali',
  className
}: BatchPuzzleImageStatusProps) {
  const is_processing = status.status === 'processing';
  const resolvedGame = status.game ?? game;
  const batch_manager_href =
    resolvedGame === 'crossword' ? '/padajala/batch_manager' : '/padavali/batch_manager';

  return (
    <div
      className={cn(
        'border-border bg-muted/30 flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="flex items-start gap-2 sm:items-center">
        {is_processing ? <Spinner className="mt-0.5 size-4 shrink-0" /> : null}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{getStatusMessage(status.status)}</span>
            <Badge variant={PUZZLE_IMAGE_BATCH_STATUS_VARIANTS[status.status]}>
              {PUZZLE_IMAGE_BATCH_STATUS_LABELS[status.status]}
            </Badge>
            {status.auto_approved ? <Badge variant="outline">Auto-apply</Badge> : null}
          </div>
          {showBatchManagerLink ? (
            <Link
              to={batch_manager_href}
              className="text-primary text-xs underline-offset-4 hover:underline"
            >
              Open Batch Manager
            </Link>
          ) : null}
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 gap-2 self-start sm:self-auto"
        onClick={onRefresh}
        disabled={isRefreshing}
      >
        <RefreshCw className={isRefreshing ? 'size-4 animate-spin' : 'size-4'} />
        Refresh
      </Button>
    </div>
  );
}
