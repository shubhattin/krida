'use client';

import { CheckIcon, Loader2Icon, XIcon } from 'lucide-react';
import type { SlugCheckStatus } from '~/hooks/useDebouncedSlugCheck';
import { cn } from '~/lib/utils';

export function SlugStatusIcon({ status }: { status: SlugCheckStatus }) {
  if (status === 'checking') {
    return <Loader2Icon className="size-4 animate-spin text-muted-foreground" />;
  }
  if (status === 'available') {
    return <CheckIcon className="size-4 text-green-600" />;
  }
  if (status === 'taken' || status === 'invalid') {
    return <XIcon className="size-4 text-red-600" />;
  }
  return null;
}

export function SlugStatusHint({
  status,
  normalizedSlug
}: {
  status: SlugCheckStatus;
  normalizedSlug: string;
}) {
  return (
    <p
      className={cn(
        'text-xs',
        status === 'taken' || status === 'invalid' ? 'text-red-600' : 'text-muted-foreground'
      )}
    >
      {status === 'invalid'
        ? 'Only lowercase letters, numbers, underscores, and dashes are allowed.'
        : null}
      {status === 'taken'
        ? 'This slug is already used by another puzzle and cannot be reused.'
        : null}
      {status === 'available' ? `Available as "${normalizedSlug}".` : null}
      {status === 'redirect_conflict'
        ? `Slug "${normalizedSlug}" conflicts with an existing redirect.`
        : null}
    </p>
  );
}
