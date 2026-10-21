'use client';

import type { ReactNode } from 'react';
import { cn } from '~/lib/utils';

/** Card wrapper for each game's content editor: title, count chip, actions and body. */
export function EditorSection({
  title,
  description,
  count,
  actions,
  accentClassName,
  children
}: {
  title: string;
  description?: ReactNode;
  count?: ReactNode;
  actions?: ReactNode;
  /** Thin gradient bar along the top edge, e.g. `from-rose-500 to-orange-500`. */
  accentClassName: string;
  children: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 shadow-sm">
      <div className={cn('absolute inset-x-0 top-0 h-1 bg-linear-to-r', accentClassName)} />
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-4 pt-5 pb-3 sm:px-5">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            {title}
            {count !== undefined ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
                {count}
              </span>
            ) : null}
          </h2>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  );
}

export function EditorEmptyState({
  icon,
  title,
  hint,
  action
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/80 px-4 py-10 text-center">
      <div className="text-muted-foreground">{icon}</div>
      <p className="font-medium">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-muted-foreground">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** Focus a field by `data-focus-key` after the next paint (used after adding rows). */
export function focusFieldSoon(key: string) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(`[data-focus-key="${CSS.escape(key)}"]`);
      element?.focus();
    })
  );
}
