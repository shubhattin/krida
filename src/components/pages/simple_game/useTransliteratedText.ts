'use client';

import { useContext, useEffect, useState } from 'react';
import { transliterate } from 'lipilekhika';
import { AppContext } from '~/components/AppDataContext';
import { DEFAULT_DATA_SCRIPT } from '~/state/script_list';

export function useTransliteratedText(text: string): string {
  const { script } = useContext(AppContext);
  const [value, setValue] = useState(text);

  useEffect(() => {
    if (!text) {
      setValue('');
      return;
    }
    if (script === DEFAULT_DATA_SCRIPT) {
      setValue(text);
      return;
    }
    let cancelled = false;
    void transliterate(text, DEFAULT_DATA_SCRIPT, script).then((result) => {
      if (!cancelled) setValue(result);
    });
    return () => {
      cancelled = true;
    };
  }, [script, text]);

  return value;
}

export function useTransliteratedList(values: readonly string[]): string[] {
  const { script } = useContext(AppContext);
  const [out, setOut] = useState<string[]>([...values]);
  const joined = values.join('\u0000');

  useEffect(() => {
    if (values.length === 0) {
      setOut([]);
      return;
    }
    if (script === DEFAULT_DATA_SCRIPT) {
      setOut([...values]);
      return;
    }
    let cancelled = false;
    void Promise.all(values.map((value) => transliterate(value, DEFAULT_DATA_SCRIPT, script))).then(
      (result) => {
        if (!cancelled) setOut(result);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [joined, script, values]);

  return out;
}
