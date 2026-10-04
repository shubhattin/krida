'use client';

import { Link } from '@tanstack/react-router';
import { ArrowRight, Layers, Tag } from 'lucide-react';

/** Jump links from per-game admin lists to the shared catalog pages. */
export function CatalogAdminLinks() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        to="/collections/list"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-1.5 text-sm font-medium no-underline transition-colors hover:bg-muted/60"
      >
        <Layers className="size-4" />
        Collections
        <ArrowRight className="size-3.5 text-muted-foreground" />
      </Link>
      <Link
        to="/tags/list"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-1.5 text-sm font-medium no-underline transition-colors hover:bg-muted/60"
      >
        <Tag className="size-4" />
        Tags
        <ArrowRight className="size-3.5 text-muted-foreground" />
      </Link>
    </div>
  );
}
