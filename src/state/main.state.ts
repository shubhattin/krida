import { atom } from 'jotai';
import { notoSansDevanagari, notoSansTelugu } from '~/components/fonts';

export const SCRIPT_LIST = ['Devanagari', 'Telugu'] as const;
export type ScriptType = (typeof SCRIPT_LIST)[number];

export const DEFAULT_DATA_SCRIPT: ScriptType = 'Devanagari';
export const script_atom = atom<ScriptType>('Devanagari');

export const FONT_INFO: Record<ScriptType, { clasName: string; fontSize: number }> = {
  Devanagari: {
    clasName: notoSansDevanagari.className,
    fontSize: 1.25
  },
  Telugu: {
    clasName: notoSansTelugu.className,
    fontSize: 1.02
  }
};
