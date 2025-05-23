import { atomWithStorage } from 'jotai/utils';
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
export const script_atom = atomWithStorage<ScriptType>('default_data_script', 'Devanagari');

export const FONT_INFO: Record<ScriptType, { clasName: string; fontSize: number }> = {
  Devanagari: {
    clasName: notoSansDevanagari.className,
    fontSize: 1.25
  },
  Telugu: {
    clasName: notoSansTelugu.className,
    fontSize: 1.15
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
