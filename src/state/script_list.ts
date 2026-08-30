import { z } from 'zod';

export const SCRIPT_LIST_MAIN = [
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
  'Sinhala',
  'Romanized'
] as const;

export const SCRIPT_LIST_ANCIENT = ['Brahmi', 'Granth', 'Siddham', 'Sharada'] as const;

export const SCRIPT_LIST = [...SCRIPT_LIST_MAIN, ...SCRIPT_LIST_ANCIENT] as const;

export type ScriptType = (typeof SCRIPT_LIST)[number];

export const SCRIPT_NAMES = {
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
  Gurumukhi: 'Gurumukhi',
  Brahmi: 'Brahmi',
  Siddham: 'Siddham',
  Sinhala: 'Sinhala',
  Sharada: 'Sharada',
  Granth: 'Grantha'
} satisfies Record<ScriptType, string>;
export const script_list_enum = z.enum(SCRIPT_LIST);

export const DEFAULT_DATA_SCRIPT: ScriptType = 'Devanagari';
export const SCRIPT_DATA_COOKIE_KEY = 'data_script';
