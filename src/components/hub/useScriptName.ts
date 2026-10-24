'use client';

import { useContext } from 'react';
import { AppContext } from '~/components/AppDataContext';
import { useTransliteratedText } from '~/components/pages/simple_game/useTransliteratedText';
import { FONT_INFO } from '~/state/script_font_data';
import type { GameKind } from '~/util/catalog/tags';

/** A brand name in IAST (Romanized display) and Devanagari (transliteration source). */
export type ScriptName = { iast: string; devanagari: string };

export const KRIDA_NAME: ScriptName = { iast: 'Krīḍā', devanagari: 'क्रीडा' };

export const GAME_SCRIPT_NAMES = {
  padavali: { iast: 'Padāvalī', devanagari: 'पदावली' },
  padajala: { iast: 'Padajāla', devanagari: 'पदजाल' },
  dvayi: { iast: 'Dvayī', devanagari: 'द्वयी' },
  bhramita: { iast: 'Bhramitā', devanagari: 'भ्रमिता' },
  surupa: { iast: 'Surūpa', devanagari: 'सुरूप' },
  anveshi: { iast: 'Ānveṣī', devanagari: 'आन्वेषी' }
} as const satisfies Record<GameKind, ScriptName>;

/**
 * Shows a brand/game name in the reader's chosen script. Romanized keeps the
 * capitalised IAST spelling rather than the lower-case transliteration.
 */
export function useScriptName(name: ScriptName) {
  const { script } = useContext(AppContext);
  const transliterated = useTransliteratedText(name.devanagari);
  if (script === 'Romanized') return { text: name.iast, fontClassName: undefined };
  return { text: transliterated, fontClassName: FONT_INFO[script].className };
}
