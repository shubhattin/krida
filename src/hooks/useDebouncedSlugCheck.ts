'use client';

import { useEffect, useState } from 'react';
import { client } from '~/api/client';
import { isValidSlug, normalizeSlug } from '~/util/puzzle/slug';
import type { z } from 'zod';
import type { redirect_conflict_schema } from '~/db/db_shared_vals';

const DEBOUNCE_MS = 400;

export type SlugCheckStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'taken'
  | 'invalid'
  | 'redirect_conflict';

export type RedirectConflict = z.infer<typeof redirect_conflict_schema>;

export type SlugCheckResult =
  | {
      available: false;
      reason: 'invalid_format' | 'taken';
      slug: string;
    }
  | {
      available: true;
      slug: string;
      redirect_conflict?: RedirectConflict;
    };

export type SlugCheckFn = (params: {
  slug: string;
  exclude_puzzle_id?: number;
}) => Promise<SlugCheckResult>;

type Options = {
  excludePuzzleId?: number;
  enabled?: boolean;
  checkSlug?: SlugCheckFn;
  isValidSlugFn?: (slug: string) => boolean;
};

const defaultCheckSlug: SlugCheckFn = (params) =>
  client.puzzle.check_slug_availability.query(params);

export const useDebouncedSlugCheck = (slugInput: string, options: Options = {}) => {
  const {
    excludePuzzleId,
    enabled = true,
    checkSlug = defaultCheckSlug,
    isValidSlugFn = isValidSlug
  } = options;
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

    if (!isValidSlugFn(normalized)) {
      setStatus('invalid');
      setRedirectConflict(null);
      return;
    }

    setStatus('checking');
    setRedirectConflict(null);
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      void checkSlug({
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
  }, [slugInput, excludePuzzleId, enabled, checkSlug, isValidSlugFn]);

  return { status, normalizedSlug, redirectConflict };
};
