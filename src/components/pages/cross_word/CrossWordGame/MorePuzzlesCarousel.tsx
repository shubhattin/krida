'use client';

import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRightIcon, LayoutGridIcon, ExternalLinkIcon } from 'lucide-react';
import { useAtom } from 'jotai';
import { client } from '~/api/client';
import { CrosswordPreviewCard } from '~/components/pages/cross_word/CrosswordPreviewCard';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from '~/components/ui/carousel';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '~/components/ui/accordion';
import { cn } from '~/lib/utils';
import {
  started_atom,
  completed_atom,
  pending_navigation_url_atom
} from '~/components/pages/cross_word/CrossWordGame/game_state';
import { PUZZLE_CARD_IMAGE_ASPECT_RATIO } from '~/components/pages/padavali/listed_puzzle_display';

const carouselNavButtonClass =
  'static top-auto right-auto bottom-auto left-auto size-7 shrink-0 translate-x-0 translate-y-0 rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-35 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700';

const carouselItemClass = 'basis-1/2 pl-3 sm:basis-1/3 lg:basis-1/4';

/** Mirrors loaded carousel chrome + card anatomy (image 3:2 + title + description). */
function MoreCrosswordPuzzlesCarouselSkeleton({
  hideHeader,
  compact,
  className
}: {
  hideHeader: boolean;
  compact: boolean;
  className?: string;
}) {
  return (
    <div className={cn(compact ? 'px-3 py-2 sm:py-3' : 'px-4 py-3 sm:py-4', className)}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-2.5 flex items-center gap-2 lg:justify-center">
          <div className="min-w-0 flex-1 lg:hidden">
            {!hideHeader ? (
              <div className="h-5 w-28 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
            ) : (
              <div className="h-3.5 w-24 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="h-6 w-18 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="size-7 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="size-7 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>

        <div className="overflow-hidden">
          <div className="-ml-3 flex">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={cn('min-w-0 shrink-0 grow-0', carouselItemClass)}>
                <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  <div
                    className="w-full animate-pulse bg-slate-200 dark:bg-slate-700"
                    style={{
                      aspectRatio: `${PUZZLE_CARD_IMAGE_ASPECT_RATIO[0]} / ${PUZZLE_CARD_IMAGE_ASPECT_RATIO[1]}`
                    }}
                  />
                  <div className={cn('flex flex-col gap-1.5', compact ? 'p-2' : 'p-3')}>
                    <div className="h-4 w-[85%] animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
                    <div className="h-3 w-[60%] animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-600" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function useLeaveGameGuard() {
  const [started] = useAtom(started_atom);
  const [completed] = useAtom(completed_atom);
  const [, setPendingUrl] = useAtom(pending_navigation_url_atom);

  const guardNavigate = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (started && !completed) {
      e.preventDefault();
      setPendingUrl(href);
    }
  };

  return { guardNavigate, gameInProgress: started && !completed };
}

const ExploreMoreCarouselCard = () => {
  const { guardNavigate } = useLeaveGameGuard();

  return (
    <Link
      to="/padajala/puzzles"
      onClick={(e) => guardNavigate(e, '/padajala/puzzles')}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-dashed border-blue-300 bg-linear-to-br from-blue-50 to-indigo-50 no-underline shadow-lg transition-all duration-200 hover:border-blue-400 hover:shadow-xl dark:border-blue-600/60 dark:from-blue-950/40 dark:to-indigo-950/40 dark:hover:border-blue-500"
    >
      <div
        className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center"
        style={{ aspectRatio: '3 / 2' }}
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-indigo-600 shadow-md transition-transform group-hover:scale-105">
          <ArrowRightIcon className="size-6 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold text-blue-700 sm:text-base dark:text-blue-300">
            Explore more
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">View all puzzles</div>
        </div>
      </div>
    </Link>
  );
};

type Props = {
  excludeSlug?: string;
  excludeId?: number;
  animateIn?: boolean;
  hideHeader?: boolean;
  className?: string;
  compact?: boolean;
};

type CrosswordPuzzlePreviewRows = Awaited<
  ReturnType<typeof client.crossword.get_listed_puzzles_preview.query>
>;
type CrosswordPuzzlePreviewRow = CrosswordPuzzlePreviewRows[number];

export const getCrosswordCarouselPuzzlesQueryFn =
  (excludeSlug?: string, excludeId?: number) => async () => {
    const puzzles: CrosswordPuzzlePreviewRows =
      await client.crossword.get_listed_puzzles_preview.query({
        exclude_slug: excludeSlug,
        exclude_id: excludeId
      });
    return puzzles;
  };

export const MoreCrosswordPuzzlesCarousel = ({
  excludeSlug,
  excludeId,
  animateIn = false,
  hideHeader = false,
  className,
  compact = false
}: Props) => {
  const { guardNavigate } = useLeaveGameGuard();

  const puzzles_q = useQuery({
    queryKey: ['crossword_listed_puzzles_carousel', excludeSlug, excludeId],
    queryFn: getCrosswordCarouselPuzzlesQueryFn(excludeSlug, excludeId)
  });

  const puzzles = puzzles_q.data ?? [];

  if (puzzles_q.isLoading) {
    return (
      <MoreCrosswordPuzzlesCarouselSkeleton
        hideHeader={hideHeader}
        compact={compact}
        className={className}
      />
    );
  }

  if (puzzles.length === 0) return null;

  const content = (
    <div className={cn(compact ? 'px-3 py-2 sm:py-3' : 'px-4 py-3 sm:py-4', className)}>
      <div className="mx-auto max-w-6xl">
        <Carousel
          opts={{
            align: 'start',
            loop: false
          }}
          className="w-full"
        >
          <div className="mb-2.5 flex items-center gap-2 lg:justify-center">
            <div className="min-w-0 flex-1 lg:hidden">
              {!hideHeader ? (
                <h2 className="text-base font-semibold text-slate-800 sm:text-lg dark:text-slate-100">
                  More puzzles
                </h2>
              ) : (
                <span className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                  Swipe to browse
                </span>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                to="/padajala/puzzles"
                onClick={(e) => guardNavigate(e, '/padajala/puzzles')}
                className="flex items-center justify-center gap-1 rounded-full border border-blue-200/70 bg-blue-50/80 px-2.5 py-1 text-xs leading-none font-medium text-blue-600 no-underline transition-all duration-150 hover:bg-blue-100 hover:text-blue-700 dark:border-blue-700/50 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/50"
              >
                <ExternalLinkIcon className="relative size-3 shrink-0 translate-y-[-1.5px]" />
                <span>View All</span>
              </Link>

              <CarouselPrevious className={carouselNavButtonClass} />
              <CarouselNext className={carouselNavButtonClass} />
            </div>
          </div>

          <CarouselContent className="-ml-3">
            {puzzles.map((puzzle: CrosswordPuzzlePreviewRow) => (
              <CarouselItem key={puzzle.id} className={carouselItemClass}>
                <CrosswordPreviewCard puzzle={puzzle} compact onNavigate={guardNavigate} />
              </CarouselItem>
            ))}
            <CarouselItem className={carouselItemClass}>
              <ExploreMoreCarouselCard />
            </CarouselItem>
          </CarouselContent>
        </Carousel>
      </div>
    </div>
  );

  if (!animateIn) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      {content}
    </motion.div>
  );
};

type AccordionProps = {
  excludeSlug?: string;
  excludeId?: number;
  className?: string;
};

export const MoreCrosswordPuzzlesAccordion = ({
  excludeSlug,
  excludeId,
  className
}: AccordionProps) => {
  const { guardNavigate } = useLeaveGameGuard();

  return (
    <div className={cn('w-full pb-1 sm:pb-2', className)}>
      <Accordion defaultValue={[]} className="w-full">
        <AccordionItem value="more-puzzles" className="border-none">
          <div className="flex items-center justify-center gap-2">
            <AccordionTrigger
              className={cn(
                'flex w-auto items-center justify-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-3.5 py-1.5 no-underline shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:no-underline hover:shadow-md dark:border-slate-700/60 dark:bg-slate-900/70',
                'text-xs font-semibold text-slate-800 dark:text-slate-100',
                '**:data-[slot=accordion-trigger-icon]:ml-2 **:data-[slot=accordion-trigger-icon]:size-3.5'
              )}
            >
              <div className="flex items-center gap-1.5">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-linear-to-br from-blue-500 to-indigo-600 shadow-sm">
                  <LayoutGridIcon className="size-3.5 text-white" />
                </div>
                <span className="leading-none">More Puzzles</span>
              </div>
            </AccordionTrigger>

            <Link
              to="/padajala/puzzles"
              onClick={(e) => guardNavigate(e, '/padajala/puzzles')}
              aria-label="Browse all puzzles"
              className="flex size-7 shrink-0 items-center justify-center rounded-full border border-blue-200/70 bg-blue-50/80 text-blue-600 shadow-sm transition-all duration-150 hover:bg-blue-100 hover:text-blue-700 dark:border-blue-700/50 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/50"
              title="Browse all puzzles"
            >
              <ExternalLinkIcon className="size-3.5" />
            </Link>
          </div>
          <AccordionContent className="mt-3 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/50 p-1 shadow-sm backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-900/30 [&_a]:no-underline">
            <div className="mx-auto max-w-6xl">
              <MoreCrosswordPuzzlesCarousel
                excludeSlug={excludeSlug}
                excludeId={excludeId}
                hideHeader
                compact
                className="px-1 sm:px-2"
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export const CompletionMoreCrosswordPuzzlesCarousel = ({
  excludeSlug,
  excludeId
}: {
  excludeSlug?: string;
  excludeId?: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="px-3 sm:px-4"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-px flex-1 bg-linear-to-r from-transparent via-slate-300 to-transparent dark:via-slate-600" />
          <span className="flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/60 px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-400">
            <LayoutGridIcon className="size-3" />
            More Puzzles
          </span>
          <div className="h-px flex-1 bg-linear-to-r from-transparent via-slate-300 to-transparent dark:via-slate-600" />
        </div>
        <MoreCrosswordPuzzlesCarousel
          excludeSlug={excludeSlug}
          excludeId={excludeId}
          hideHeader
          compact
        />
      </div>
    </motion.div>
  );
};
