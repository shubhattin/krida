'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

type SeeAllLink =
  | {
      to: '/explore';
      search?: {
        game?: 'all' | 'padavali' | 'crossword';
        view?: 'puzzles' | 'collections';
        tag?: string;
      };
    }
  | { to: '/collections/$slug'; params: { slug: string } }
  | { to: '/padavali' | '/padajala' | '/padavali/puzzles' | '/padajala/puzzles' };

export function HubShelf({
  title,
  seeAll,
  children,
  itemCount
}: {
  title: string;
  seeAll?: SeeAllLink;
  children: ReactNode;
  itemCount: number;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const update = () => {
      setCanPrev(el.scrollLeft > 12);
      setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 12);
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [itemCount]);

  const scrollByDir = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: 'smooth' });
  };

  if (itemCount === 0) return null;

  return (
    <section className="group/shelf flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3 px-4 sm:px-8 lg:px-12">
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h2>
        {seeAll ? <ShelfSeeAll link={seeAll} /> : null}
      </div>
      <div className="relative">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label={`Previous in ${title}`}
          disabled={!canPrev}
          onClick={() => scrollByDir(-1)}
          className={cn(
            'absolute top-1/2 left-1 z-10 hidden size-10 -translate-y-1/2 rounded-full bg-background/80 shadow-lg backdrop-blur-md md:inline-flex',
            'opacity-0 transition-opacity group-hover/shelf:opacity-100 disabled:opacity-0',
            'motion-reduce:opacity-100'
          )}
        >
          <ChevronLeft />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label={`Next in ${title}`}
          disabled={!canNext}
          onClick={() => scrollByDir(1)}
          className={cn(
            'absolute top-1/2 right-1 z-10 hidden size-10 -translate-y-1/2 rounded-full bg-background/80 shadow-lg backdrop-blur-md md:inline-flex',
            'opacity-0 transition-opacity group-hover/shelf:opacity-100 disabled:opacity-0',
            'motion-reduce:opacity-100'
          )}
        >
          <ChevronRight />
        </Button>
        <div
          ref={scrollerRef}
          className="flex snap-x snap-mandatory [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-2 sm:gap-4 sm:px-8 lg:px-12 [&::-webkit-scrollbar]:hidden"
        >
          {children}
        </div>
      </div>
    </section>
  );
}

const seeAllClass =
  'text-sm font-medium text-muted-foreground no-underline transition-colors hover:text-foreground';

function ShelfSeeAll({ link }: { link: SeeAllLink }) {
  if (link.to === '/explore') {
    return (
      <Link to="/explore" search={link.search} className={seeAllClass}>
        See all
      </Link>
    );
  }
  if (link.to === '/collections/$slug') {
    return (
      <Link to="/collections/$slug" params={link.params} className={seeAllClass}>
        See all
      </Link>
    );
  }
  return (
    <Link to={link.to} className={seeAllClass}>
      See all
    </Link>
  );
}
