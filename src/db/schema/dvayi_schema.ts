import type { DvayiPuzzleData } from '~/util/dvayi/data';
import { defineSimpleGameTables } from './simple_game_tables';

export const dvayi_tables = defineSimpleGameTables<DvayiPuzzleData>('dvayi');

export const dvayi_puzzles = dvayi_tables.puzzles;
export const dvayi_puzzlesRelations = dvayi_tables.puzzlesRelations;
