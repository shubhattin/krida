import type { BhramitaPuzzleData } from '~/util/bhramita/data';
import { defineSimpleGameTables } from './simple_game_tables';

export const bhramita_tables = defineSimpleGameTables<BhramitaPuzzleData>('bhramita');
const tables = bhramita_tables;

export const bhramita_puzzles = tables.puzzles;
export const bhramita_redirects = tables.redirects;
export const bhramita_attachments = tables.attachments;
export const bhramita_sessions = tables.sessions;
export const bhramita_gameplay_stats = tables.gameplay_stats;
export const bhramita_puzzle_tags = tables.puzzle_tags;
export const bhramita_collection_items = tables.collection_items;

export const bhramita_puzzlesRelations = tables.puzzlesRelations;
export const bhramita_puzzle_tagsRelations = tables.puzzle_tagsRelations;
export const bhramita_collection_itemsRelations = tables.collection_itemsRelations;
export const bhramita_puzzle_redirectsRelations = tables.redirectsRelations;
export const bhramita_puzzle_attachmentsRelations = tables.attachmentsRelations;
export const bhramita_puzzle_gameplay_sessionsRelations = tables.sessionsRelations;
export const bhramita_puzzle_gameplay_statsRelations = tables.gameplay_statsRelations;
