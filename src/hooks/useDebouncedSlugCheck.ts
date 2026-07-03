'use client';

import { useEffect, useState } from 'react';
import { client } from '~/api/client';
import { isValidSlug, normalizeSlug } from '~/util/puzzle/slug';
import type { z } from 'zod';
import type { redirect_conflict_schema } from '~/db/db_shared_vals';

const DEBOUNCE_MS = 400;

export type SlugCheckStatus =
  'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'redirect_conflict';

export type RedirectConflict = z.infer<typeof redirect_conflict_schema>;

type Options = {
  excludePuzzleId?: number;
  enabled?: boolean;
};

export const useDebouncedSlugCheck = (slugInput: string, options: Options = {}) => {
  const { excludePuzzleId, enabled = true } = options;
  const [status, setStatus] = useState<SlugCheckStatus>('idle');
  const [normalizedSlug, setNormalizedSlug] = useState('');
  const [redirectConflict, setRedirectConflict] = useState<RedirectConflict | null>(null);

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      setNormalizedSlug('');
      setRedirectConflict(null);
      return;
    }

    const normalized = normalizeSlug(slugInput);
    setNormalizedSlug(normalized);

    if (!normalized) {
      setStatus('idle');
      setRedirectConflict(null);
      return;
    }

    if (!isValidSlug(normalized)) {
      setStatus('invalid');
      setRedirectConflict(null);
      return;
    }

    setStatus('checking');
    setRedirectConflict(null);
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      void client.puzzle.check_slug_availability
        .query({
          slug: normalized,
          exclude_puzzle_id: excludePuzzleId
        })
        .then((result) => {
          if (cancelled) return;
          if (!result.available) {
            if (result.reason === 'invalid_format') {
              setStatus('invalid');
            } else {
              setStatus('taken');
            }
            setRedirectConflict(null);
            return;
          }

          if ('redirect_conflict' in result && result.redirect_conflict) {
            setStatus('redirect_conflict');
            setRedirectConflict(result.redirect_conflict);
            return;
          }

          setStatus('available');
          setRedirectConflict(null);
        })
        .catch(() => {
          if (!cancelled) {
            setStatus('idle');
            setRedirectConflict(null);
          }
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [slugInput, excludePuzzleId, enabled]);

  return { status, normalizedSlug, redirectConflict };
};
