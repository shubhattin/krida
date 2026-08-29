'use client';

import { Link } from '@tanstack/react-router';
import { ExternalLink, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type PreviewWarningBannerProps = {
  listed: boolean;
  slug: string;
};

export function PreviewWarningBanner({ listed, slug }: PreviewWarningBannerProps) {
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
            For sharing unlisted puzzles and internal testing. This page is not the public listed
            URL.
          </PopoverContent>
        </Popover>
      </div>
      {listed ? (
        <Link
          to="/padavali/$slug"
          params={{ slug }}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Listed URL
          <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}
