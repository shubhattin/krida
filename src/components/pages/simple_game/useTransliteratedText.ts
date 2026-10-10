'use client';

import { useContext, useEffect, useState } from 'react';
import { AppContext } from '~/components/AppDataContext';
import { DEFAULT_DATA_SCRIPT } from '~/state/script_list';
import { transliterate_custom } from '~/tools/transliterator';

export function useTransliteratedText(text: string): string {
  const { script } = useContext(AppContext);
  const [translated, setTranslated] = useState<{ key: string; value: string } | null>(null);
  const key = `${script}\0${text}`;

  useEffect(() => {
    if (!text || script === DEFAULT_DATA_SCRIPT) return;
    let cancelled = false;
    void transliterate_custom(text, DEFAULT_DATA_SCRIPT, script).then((result) => {
      if (!cancelled) setTranslated({ key, value: result });
    });
    return () => {
      cancelled = true;
    };
  }, [key, script, text]);

  if (!text) return '';
  if (script === DEFAULT_DATA_SCRIPT) return text;
  return translated?.key === key ? translated.value : text;
}

export function useTransliteratedList(values: readonly string[]): string[] {
  const { script } = useContext(AppContext);
  const joined = values.join('\u0000');
  const key = `${script}\0${joined}`;
  const [translated, setTranslated] = useState<{ key: string; value: string[] } | null>(null);

  useEffect(() => {
    if (values.length === 0 || script === DEFAULT_DATA_SCRIPT) return;
    let cancelled = false;
    void Promise.all(
      values.map((value) => transliterate_custom(value, DEFAULT_DATA_SCRIPT, script))
    ).then((result) => {
      if (!cancelled) setTranslated({ key, value: result });
    });
    return () => {
      cancelled = true;
    };
  }, [joined, key, script, values]);

  if (values.length === 0) return [];
  if (script === DEFAULT_DATA_SCRIPT) return [...values];
  return translated?.key === key ? translated.value : [...values];
}
