'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IoShareSocialOutline } from 'react-icons/io5';
import { cn } from '~/lib/utils';
import type { PublicGameKind } from '~/util/games/kinds';
import { PuzzleBackLink } from './PuzzleBackLink';
import titleStyles from './puzzle-title.module.css';

/** Description under the title: two lines by default, expandable when it overflows. */
function PuzzleDescription({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setOverflowing(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  return (
    <div className="flex max-w-2xl flex-col items-center gap-0.5">
      <p
        ref={ref}
        className={cn(
          'text-sm leading-relaxed text-pretty text-slate-600 sm:text-base dark:text-slate-300',
          !expanded && 'line-clamp-2',
          className
        )}
      >
        {text}
      </p>
      {overflowing || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="text-xs font-semibold text-primary hover:underline"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      ) : null}
    </div>
  );
}

export function PuzzleShareButton({ onShare }: { onShare: () => void }) {
  return (
    <button
      type="button"
      onClick={onShare}
      aria-label="Share puzzle"
      title="Share puzzle"
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-2.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-900 sm:px-3 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-50"
    >
      <IoShareSocialOutline className="size-4" />
      <span className="hidden sm:inline">Share</span>
    </button>
  );
}

/** Shared puzzle page header (padavali + padajala). */
export function PuzzleHeader({
  title,
  description,
  fontClassName,
  backToGame,
  toolbar,
  actions
}: {
  title: string;
  description?: string | null;
  /** Script font for transliterated title/description. */
  fontClassName?: string;
  /** Show an "All puzzles" link filtered to this game in the top bar. */
  backToGame?: PublicGameKind;
  /** Secondary controls (script, share) — top-right, out of the way. */
  toolbar?: ReactNode;
  /** Gameplay actions (hint) — centered under the description. */
  actions?: ReactNode;
}) {
  const trimmed = description?.trim();

  return (
    <>
      {backToGame || toolbar ? (
        <div className="mb-2 flex min-h-8 items-center justify-between gap-2 sm:mb-1">
          {backToGame ? <PuzzleBackLink game={backToGame} /> : <span />}
          {toolbar ? <div className="flex items-center gap-1.5 sm:gap-2">{toolbar}</div> : null}
        </div>
      ) : null}
      <header className="mx-auto mb-3 flex max-w-3xl flex-col items-center gap-2 text-center sm:mb-6 sm:gap-3">
        {/* Title and description read as one unit; spacing goes before the actions. */}
        <div className="flex flex-col items-center">
          <h1
            className={cn(
              // Small vertical padding keeps gradient-clipped matras/descenders from being cut.
              'pt-1 pb-0.5 text-2xl leading-tight font-bold tracking-tight text-balance sm:text-3xl md:text-4xl',
              titleStyles.titleGradient,
              fontClassName
            )}
          >
            {title}
          </h1>
          {trimmed ? <PuzzleDescription text={trimmed} className={fontClassName} /> : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center justify-center gap-2">{actions}</div>
        ) : null}
      </header>
    </>
  );
}
