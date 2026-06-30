'use client';

import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function PreviewWarningBanner() {
  return (
    <div className="mt-3 flex justify-center px-4 sm:px-6">
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
            For sharing unlisted puzzles and internal testing. This page is not the public listed
            URL.
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
