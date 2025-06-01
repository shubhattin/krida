import { atom } from 'jotai';
import { DEFAULT_DATA_SCRIPT, type ScriptType } from './script_font_data';

export const script_atom = atom<ScriptType>(DEFAULT_DATA_SCRIPT);
