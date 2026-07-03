'use client';

import { useContext, useEffect, useState } from 'react';
import { transliterate } from 'lipilekhika';
import { client_q } from '~/api/client';
import { AppContext } from '~/components/AppDataContext';
import { DEFAULT_DATA_SCRIPT } from '~/state/script_list';

export function useWordMeanings(puzzle_id: number, puzzle_slug: string) {
  const { script } = useContext(AppContext);
  const [transliteratedWords, setTransliteratedWords] = useState<Record<string, string>>({});

  const query = client_q.public_ai.get_puzzle_word_meanings.useQuery(
    { puzzle_id, puzzle_slug },
    { staleTime: Infinity }
  );

  useEffect(() => {
    if (!query.data?.words) return;
    let active = true;
    const run = async () => {
      const entries = await Promise.all(
        query.data!.words.map(async (w) => {
          const tWord =
            script === DEFAULT_DATA_SCRIPT
              ? w.word
              : await transliterate(w.word, DEFAULT_DATA_SCRIPT, script!);
          return [w.word, tWord] as const;
        })
      );
      if (active) {
        setTransliteratedWords(Object.fromEntries(entries));
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [query.data?.words, script]);

  return { ...query, transliteratedWords, script };
}
