import type { BhramitaPuzzleData } from '~/util/bhramita/data';
import { defineSimpleGameTables } from './simple_game_tables';

export const bhramita_tables = defineSimpleGameTables<BhramitaPuzzleData>('bhramita');

export const bhramita_puzzles = bhramita_tables.puzzles;
export const bhramita_puzzlesRelations = bhramita_tables.puzzlesRelations;
