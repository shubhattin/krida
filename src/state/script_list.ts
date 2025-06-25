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

export const ATTACHMENT_TYPE_LIST = [
  'link',
  'youtube_video',
  'youtube_playlist',
  'youtube_embed'
] as const;
export type attachment_list_type = (typeof ATTACHMENT_TYPE_LIST)[number];
export const ATTACHMENT_TYPE_NAMES: Record<attachment_list_type, string> = {
  link: 'Link',
  youtube_video: 'Youtube Video',
  youtube_playlist: 'Youtube Playlist',
  youtube_embed: 'Youtube Embed'
};
