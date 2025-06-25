import { z } from 'zod';

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
  'Gurumukhi',
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
  Romanized: 'Romanized',
  Gurumukhi: 'Gurumukhi'
};
export const script_list_enum = z.enum(SCRIPT_LIST);

export const DEFAULT_DATA_SCRIPT: ScriptType = 'Devanagari';
export const SCRIPT_DATA_COOKIE_KEY = 'data_script';
