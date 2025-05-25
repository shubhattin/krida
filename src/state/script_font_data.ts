import {
  notoSansDevanagari,
  notoSansKannada,
  notoSansTelugu,
  notoSansBengali,
  notoSansGujarati
} from '~/components/fonts';

export const SCRIPT_LIST = ['Devanagari', 'Telugu', 'Kannada', 'Gujarati', 'Bengali'] as const;
export type ScriptType = (typeof SCRIPT_LIST)[number];

export const DEFAULT_DATA_SCRIPT: ScriptType = 'Devanagari';
export const SCRIPT_DATA_COOKIE_KEY = 'data_script';
export const get_lang_from_cookie = (value?: string) => {
  if (value && SCRIPT_LIST.includes(value as ScriptType)) {
    return value as ScriptType;
  } else {
    return DEFAULT_DATA_SCRIPT as ScriptType;
  }
};

export const FONT_INFO: Record<ScriptType, { clasName: string; fontSize: number }> = {
  Devanagari: {
    clasName: notoSansDevanagari.className,
    fontSize: 1.25
  },
  Telugu: {
    clasName: notoSansTelugu.className,
    fontSize: 1.125
  },
  Kannada: {
    clasName: notoSansKannada.className,
    fontSize: 1.01
  },
  Bengali: {
    clasName: notoSansBengali.className,
    fontSize: 1.25
  },
  Gujarati: {
    clasName: notoSansGujarati.className,
    fontSize: 1.25
  }
};
