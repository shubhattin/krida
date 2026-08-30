import {
  notoSansDevanagari,
  notoSansKannada,
  notoSansTelugu,
  notoSansBengali,
  notoSansGujarati,
  notoSansOdia,
  notoSansTamil,
  notoSansMalayalam,
  robotoSans,
  notoSansGurumukhi,
  notoSansSinhala,
  notoSansSiddham,
  notoSansSharada,
  notoSansGrantha,
  segoiUIHistoric
} from '~/components/fonts';
import { SCRIPT_LIST, DEFAULT_DATA_SCRIPT, type ScriptType } from './script_list';

export const get_lang_from_cookie = (value?: string) => {
  // SAFETY: find() over the literal SCRIPT_LIST tuple narrows the cookie value
  const found = value ? SCRIPT_LIST.find((script) => script === value) : undefined;
  return found ?? DEFAULT_DATA_SCRIPT;
};

type ScriptFontInfo = { className: string; fontSize: number; experimental?: boolean };

/** Named owner contract: keeps the map exhaustive over ScriptType with the full value shape. */
function defineFontInfo(
  map: Record<ScriptType, ScriptFontInfo>
): Record<ScriptType, ScriptFontInfo> {
  return map;
}

export const FONT_INFO = defineFontInfo({
  Devanagari: {
    className: notoSansDevanagari.className,
    fontSize: 1.25
  },
  Telugu: {
    className: notoSansTelugu.className,
    fontSize: 1.125
  },
  Kannada: {
    className: notoSansKannada.className,
    fontSize: 0.98
  },
  Bengali: {
    className: notoSansBengali.className,
    fontSize: 1.25
  },
  Gujarati: {
    className: notoSansGujarati.className,
    fontSize: 1.25
  },
  Odia: {
    className: notoSansOdia.className,
    fontSize: 1.25
  },
  Assamese: {
    className: notoSansBengali.className,
    fontSize: 1.25
  },
  Malayalam: {
    className: notoSansMalayalam.className,
    fontSize: 0.93,
    experimental: true
  },
  'Tamil-Extended': {
    className: notoSansTamil.className,
    fontSize: 0.84,
    experimental: true
  },
  Romanized: {
    className: robotoSans.className,
    fontSize: 0.92
  },
  Gurumukhi: {
    className: notoSansGurumukhi.className,
    fontSize: 1.12
  },
  Sinhala: {
    className: notoSansSinhala.className,
    fontSize: 1.02
  },
  // Ancient Scripts
  Brahmi: {
    className: segoiUIHistoric.className,
    fontSize: 1.15,
    experimental: false
  },
  Siddham: {
    className: notoSansSiddham.className,
    fontSize: 1.15,
    experimental: true
  },
  Sharada: {
    className: notoSansSharada.className,
    fontSize: 1.15,
    experimental: true
  },
  Granth: {
    className: notoSansGrantha.className,
    fontSize: 0.82,
    experimental: true
  }
});
