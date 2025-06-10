import {
  notoSansDevanagari,
  notoSansKannada,
  notoSansTelugu,
  notoSansBengali,
  notoSansGujarati,
  notoSansOdia,
  notoSansTamil,
  notoSansMalayalam,
  robotoSans
} from '~/components/fonts';

export const SCRIPT_LIST = [
  'Devanagari',
  'Telugu',
  'Kannada',
  'Gujarati',
  'Bengali',
  'Odia',
  'Malayalam',
  'Tamil-Extended',
  'Assamese',
  'Romanized'
] as const;
export type ScriptType = (typeof SCRIPT_LIST)[number];

export const SCRIPT_NAMES: Record<ScriptType, string> = {
  Devanagari: 'Devanagari',
  Telugu: 'Telugu',
  Kannada: 'Kannada',
  Gujarati: 'Gujarati',
  Bengali: 'Bengali',
  Odia: 'Odia',
  Malayalam: 'Malayalam',
  Assamese: 'Assamese',
  'Tamil-Extended': 'Tamil',
  Romanized: 'Romanized'
};

export const DEFAULT_DATA_SCRIPT: ScriptType = 'Devanagari';
export const SCRIPT_DATA_COOKIE_KEY = 'data_script';
export const get_lang_from_cookie = (value?: string) => {
  if (value && SCRIPT_LIST.includes(value as ScriptType)) {
    return value as ScriptType;
  } else {
    return DEFAULT_DATA_SCRIPT as ScriptType;
  }
};

export const FONT_INFO: Record<ScriptType, { className: string; fontSize: number }> = {
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
    fontSize: 1.0
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
    fontSize: 0.93
  },
  'Tamil-Extended': {
    className: notoSansTamil.className,
    fontSize: 0.85
  },
  Romanized: {
    className: robotoSans.className,
    fontSize: 0.93
  }
};
