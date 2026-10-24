'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import { AppContext } from '~/components/AppDataContext';
import { DEFAULT_DATA_SCRIPT } from '~/state/script_list';
import { transliterate_custom } from '~/tools/transliterator';
import type { SimpleListedPuzzle } from '~/util/cache.server/simple_game_cache';

/**
 * Script-aware display rows for a simple game's listed puzzles. Seeds from the
 * server-transliterated rows so first paint (and hydration) already matches the
 * selected script; re-transliterates client-side when the script changes.
 */
export function useSimpleListedPuzzles(
  listed: SimpleListedPuzzle[],
  listed_init_transliterated: SimpleListedPuzzle[]
): SimpleListedPuzzle[] {
  const { script } = useContext(AppContext);
  const [display, setDisplay] = useState(listed_init_transliterated);
  const [prev, setPrev] = useState({ init: listed_init_transliterated, script });
  if (listed_init_transliterated !== prev.init || script !== prev.script) {
    const scriptSwitched = script !== prev.script;
    setPrev({ init: listed_init_transliterated, script });
    if (!scriptSwitched || script === DEFAULT_DATA_SCRIPT) {
      // Fresh loader rows (always in the active script), or back to raw Devanagari.
      setDisplay(script === DEFAULT_DATA_SCRIPT ? listed : listed_init_transliterated);
    }
    // Otherwise the script just switched: keep showing the previous rows until
    // the effect below resolves the transliteration (same as Padavali cards).
  }
  const listedRef = useRef(listed);
  // Keep the ref fresh for the transliteration effect below (ref access is
  // effect-only; reading .current during render would break on updates).
  useEffect(() => {
    listedRef.current = listed;
  });

  useEffect(() => {
    if (script === DEFAULT_DATA_SCRIPT) return;
    let cancelled = false;
    const rows = listedRef.current;
    const texts = rows.flatMap((p) => (p.description ? [p.title, p.description] : [p.title]));
    void transliterate_custom(texts, DEFAULT_DATA_SCRIPT, script).then((translated) => {
      if (cancelled) return;
      let i = 0;
      setDisplay(
        rows.map((puzzle) => ({
          ...puzzle,
          title: translated[i++]!,
          description: puzzle.description ? translated[i++]! : puzzle.description
        }))
      );
    });
    return () => {
      cancelled = true;
    };
  }, [script]);

  return display;
}
