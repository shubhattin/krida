'use client';

import { useEffect, useState } from 'react';
import { client } from '~/api/client';
import { isValidSlug, normalizeSlug } from '~/util/puzzle/slug';

const DEBOUNCE_MS = 400;

export type SlugCheckStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

type Options = {
  excludePuzzleId?: number;
  enabled?: boolean;
};

export const useDebouncedSlugCheck = (slugInput: string, options: Options = {}) => {
  const { excludePuzzleId, enabled = true } = options;
  const [status, setStatus] = useState<SlugCheckStatus>('idle');
  const [normalizedSlug, setNormalizedSlug] = useState('');

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      setNormalizedSlug('');
      return;
    }

    const normalized = normalizeSlug(slugInput);
    setNormalizedSlug(normalized);

    if (!normalized) {
      setStatus('idle');
      return;
    }

    if (!isValidSlug(normalized)) {
      setStatus('invalid');
      return;
    }

    setStatus('checking');
    const timeoutId = setTimeout(() => {
      void client.puzzle.check_slug_availability
        .query({
          slug: normalized,
          exclude_puzzle_id: excludePuzzleId
        })
        .then((result) => {
          if (result.available) {
            setStatus('available');
          } else if (result.reason === 'invalid_format') {
            setStatus('invalid');
          } else {
            setStatus('taken');
          }
        })
        .catch(() => {
          setStatus('idle');
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [slugInput, excludePuzzleId, enabled]);

  return { status, normalizedSlug };
};
