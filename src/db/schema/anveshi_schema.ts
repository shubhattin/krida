import type { AnveshiPuzzleData } from '~/util/anveshi/data';
import { defineSimpleGameTables } from './simple_game_tables';

export const anveshi_tables = defineSimpleGameTables<AnveshiPuzzleData>('anveshi');

export const anveshi_puzzles = anveshi_tables.puzzles;
export const anveshi_puzzlesRelations = anveshi_tables.puzzlesRelations;
