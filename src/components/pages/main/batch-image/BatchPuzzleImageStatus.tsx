'use client';

import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Spinner } from '~/components/ui/spinner';
import { Badge } from '~/components/ui/badge';
import type { AppRouter } from '~/api/trpc_router';
import type { inferRouterOutputs } from '@trpc/server';

type RouterOutput = inferRouterOutputs<AppRouter>;
export type PuzzleImageBatchStatus = NonNullable<
  RouterOutput['batch_ai']['get_puzzle_image_batch_status']
>;

type BatchPuzzleImageStatusProps = {
  status: PuzzleImageBatchStatus;
  onRefresh: () => void;
  isRefreshing?: boolean;
  showBatchManagerLink?: boolean;
  className?: string;
};

const status_label: Record<PuzzleImageBatchStatus['status'], string> = {
  processing: 'Processing',
  ready_for_review: 'Ready for review',
  failed: 'Failed'
};

const status_variant: Record<
  PuzzleImageBatchStatus['status'],
  'secondary' | 'default' | 'destructive'
> = {
  processing: 'secondary',
  ready_for_review: 'default',
  failed: 'destructive'
};

export function BatchPuzzleImageStatus({
  status,
  onRefresh,
  isRefreshing,
  showBatchManagerLink = true,
  className
}: BatchPuzzleImageStatusProps) {
  const is_processing = status.status === 'processing';

  return (
    <div
      className={
        className ??
        'flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between'
      }
    >
      <div className="flex items-start gap-2 sm:items-center">
        {is_processing ? <Spinner className="mt-0.5 size-4 shrink-0" /> : null}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              {is_processing
                ? 'Image generation is processing in the background.'
                : status.status === 'ready_for_review'
                  ? 'A generated image is ready for review.'
                  : 'Background image generation failed.'}
            </span>
            <Badge variant={status_variant[status.status]}>{status_label[status.status]}</Badge>
            {status.auto_approved ? <Badge variant="outline">Auto-apply</Badge> : null}
          </div>
          {showBatchManagerLink ? (
            <Link
              href="/padavali/batch_manager"
              className="text-xs text-primary underline-offset-4 hover:underline"
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
