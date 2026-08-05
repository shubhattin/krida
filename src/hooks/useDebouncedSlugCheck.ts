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

type AsyncCheckResult = {
  slug: string;
  status: SlugCheckStatus;
  redirectConflict: RedirectConflict | null;
};

export const useDebouncedSlugCheck = (slugInput: string, options: Options = {}) => {
  const {
    excludePuzzleId,
    enabled = true,
    checkSlug = defaultCheckSlug,
    isValidSlugFn = isValidSlug
  } = options;

  const normalizedSlug = enabled ? normalizeSlug(slugInput) : '';

  const syncStatus: SlugCheckStatus | null =
    !enabled || !normalizedSlug
      ? 'idle'
      : !isValidSlugFn(normalizedSlug)
        ? 'invalid'
        : null;

  const [checkResult, setCheckResult] = useState<AsyncCheckResult>({
    slug: '',
    status: 'idle',
    redirectConflict: null
  });

  const status: SlugCheckStatus =
    syncStatus ?? (checkResult.slug === normalizedSlug ? checkResult.status : 'checking');

  const redirectConflict: RedirectConflict | null =
    syncStatus !== null
      ? null
      : checkResult.slug === normalizedSlug
        ? checkResult.redirectConflict
        : null;

  useEffect(() => {
    if (syncStatus !== null) return;

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      void checkSlug({
        slug: normalizedSlug,
        exclude_puzzle_id: excludePuzzleId
      })
        .then((result) => {
          if (cancelled) return;
          if (!result.available) {
            const nextStatus: SlugCheckStatus =
              result.reason === 'invalid_format' ? 'invalid' : 'taken';
            setCheckResult({ slug: normalizedSlug, status: nextStatus, redirectConflict: null });
            return;
          }

          if ('redirect_conflict' in result && result.redirect_conflict) {
            setCheckResult({
              slug: normalizedSlug,
              status: 'redirect_conflict',
              redirectConflict: result.redirect_conflict
            });
            return;
          }

          setCheckResult({ slug: normalizedSlug, status: 'available', redirectConflict: null });
        })
        .catch(() => {
          if (!cancelled) {
            setCheckResult({ slug: normalizedSlug, status: 'idle', redirectConflict: null });
          }
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [normalizedSlug, excludePuzzleId, syncStatus, checkSlug]);

  return { status, normalizedSlug, redirectConflict };
};
