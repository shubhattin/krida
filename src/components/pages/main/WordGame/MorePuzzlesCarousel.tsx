'use client';

import { useContext } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { transliterate } from 'lipilekhika';
import { motion } from 'framer-motion';
import { ArrowRightIcon } from 'lucide-react';
import { client } from '~/api/client';
import { AppContext } from '~/components/AppDataContext';
import { DEFAULT_DATA_SCRIPT } from '~/state/script_list';
import { PuzzlePreviewCard } from '~/components/pages/main/PuzzlePreviewCard';
import {
  mapListedPuzzlesForDisplay,
  NORMAL_TITLE_SCRIPT,
  PUZZLE_CARD_IMAGE_ASPECT_RATIO
} from '~/components/pages/main/listed_puzzle_display';
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

const carouselNavButtonClass =
  'static top-auto right-auto bottom-auto left-auto size-9 shrink-0 translate-x-0 translate-y-0 rounded-full border border-slate-300 bg-white text-slate-700 shadow-md hover:bg-slate-50 disabled:opacity-35 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700';

const carouselItemClass = 'basis-1/2 pl-3 sm:basis-1/3 lg:basis-1/4';

const ExploreMoreCarouselCard = () => {
  const [w, h] = PUZZLE_CARD_IMAGE_ASPECT_RATIO;

  return (
    <Link
      href="/padavali/puzzles"
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-dashed border-blue-300 bg-linear-to-br from-blue-50 to-indigo-50 no-underline shadow-lg transition-all duration-200 hover:border-blue-400 hover:shadow-xl dark:border-blue-600/60 dark:from-blue-950/40 dark:to-indigo-950/40 dark:hover:border-blue-500"
    >
      <div
        className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center"
        style={{ aspectRatio: `${w} / ${h}` }}
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
  animateIn?: boolean;
  hideHeader?: boolean;
  className?: string;
};

export const MorePuzzlesCarousel = ({
  excludeSlug,
  animateIn = false,
  hideHeader = false,
  className
}: Props) => {
  const { script } = useContext(AppContext);

  const puzzles_q = useQuery({
    queryKey: ['listed_puzzles_carousel', script, excludeSlug],
    queryFn: async () => {
      const org = await client.puzzle.get_listed_puzzles_preview.query({
        exclude_slug: excludeSlug
      });
      if (org.length === 0) return [];

      const [transliterated_texts, normal_titles] = await Promise.all([
        transliterate(
          org.flatMap((p) => (p.description ? [p.title, p.description] : [p.title])),
          DEFAULT_DATA_SCRIPT,
          script
        ),
        transliterate(
          org.map((p) => p.title),
          DEFAULT_DATA_SCRIPT,
          NORMAL_TITLE_SCRIPT,
          {
            'all_to_normal:replace_avagraha_with_a': true,
            'all_to_normal:replace_pancham_varga_varna_with_n': true
          }
        )
      ]);

      return mapListedPuzzlesForDisplay(org, transliterated_texts, normal_titles);
    }
  });

  const puzzles = puzzles_q.data ?? [];

  if (puzzles_q.isLoading) {
    return (
      <div className={cn('px-4 py-6', className)}>
        <div className="mx-auto max-w-6xl">
          {!hideHeader && (
            <div className="mb-4 h-6 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-3/2 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (puzzles.length === 0) return null;

  const showNav = puzzles.length > 0;

  const content = (
    <div className={cn('px-4 py-4 sm:py-6', className)}>
      <div className="mx-auto max-w-6xl">
        <Carousel
          opts={{
            align: 'start',
            loop: false
          }}
          className="w-full"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            {!hideHeader ? (
              <h2 className="text-lg font-semibold text-slate-800 sm:text-xl dark:text-slate-100">
                More puzzles
              </h2>
            ) : (
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Swipe or use arrows to browse
              </span>
            )}
            {showNav && (
              <div className="flex shrink-0 items-center gap-2">
                <CarouselPrevious className={carouselNavButtonClass} />
                <CarouselNext className={carouselNavButtonClass} />
              </div>
            )}
          </div>

          <CarouselContent className="-ml-3">
            {puzzles.map((puzzle) => (
              <CarouselItem key={puzzle.id} className={carouselItemClass}>
                <PuzzlePreviewCard puzzle={puzzle} compact />
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
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {content}
    </motion.div>
  );
};

type AccordionProps = {
  excludeSlug?: string;
  className?: string;
};

export const MorePuzzlesAccordion = ({ excludeSlug, className }: AccordionProps) => {
  return (
    <div className={cn('px-4 pb-2', className)}>
      <div className="mx-auto max-w-6xl">
        <Accordion defaultValue={[]}>
          <AccordionItem
            value="more-puzzles"
            className="overflow-hidden rounded-xl border border-slate-200/80 bg-white/60 dark:border-slate-700/80 dark:bg-slate-900/40"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="text-left">
                <div className="font-semibold text-slate-800 dark:text-slate-100">More puzzles</div>
                <div className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  Browse other available word puzzles
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-0 [&_a]:no-underline">
              <MorePuzzlesCarousel
                excludeSlug={excludeSlug}
                hideHeader
                className="px-2 py-3 sm:px-3"
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
};
