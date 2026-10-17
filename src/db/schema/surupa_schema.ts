import type { SurupaPuzzleData } from '~/util/surupa/data';
import { defineSimpleGameTables } from './simple_game_tables';

export const surupa_tables = defineSimpleGameTables<SurupaPuzzleData>('surupa');

export const surupa_puzzles = surupa_tables.puzzles;
export const surupa_puzzlesRelations = surupa_tables.puzzlesRelations;
