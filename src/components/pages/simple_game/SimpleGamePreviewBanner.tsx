'use client';

import { ExternalLink, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { simpleGameHref, type SimpleGameKind } from '~/util/games/kinds';

export function SimpleGamePreviewBanner({
  kind,
  listed,
  slug
}: {
  kind: SimpleGameKind;
  listed: boolean;
  slug: string;
}) {
  return (
    <div className="my-3 flex flex-wrap items-center justify-center gap-3 px-4 sm:px-6">
      <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
        <span>Preview URL</span>
        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="inline-flex shrink-0 border-0 bg-transparent p-0 text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                aria-label="Preview page info"
              >
                <Info className="size-4" aria-hidden="true" />
              </button>
            }
          />
          <PopoverContent className="max-w-xs text-xs" align="center">
            For sharing private puzzles and internal testing. This page is not the public puzzle
            URL.
          </PopoverContent>
        </Popover>
      </div>
      {listed ? (
        <a
          href={simpleGameHref(kind, slug)}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Puzzle URL
          <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}
