import type { DvayiPuzzleData } from '~/util/dvayi/data';
import { defineSimpleGameTables } from './simple_game_tables';

export const dvayi_tables = defineSimpleGameTables<DvayiPuzzleData>('dvayi');
const tables = dvayi_tables;

export const dvayi_puzzles = tables.puzzles;
export const dvayi_redirects = tables.redirects;
export const dvayi_attachments = tables.attachments;
export const dvayi_sessions = tables.sessions;
export const dvayi_gameplay_stats = tables.gameplay_stats;
export const dvayi_puzzle_tags = tables.puzzle_tags;
export const dvayi_collection_items = tables.collection_items;

export const dvayi_puzzlesRelations = tables.puzzlesRelations;
export const dvayi_puzzle_tagsRelations = tables.puzzle_tagsRelations;
export const dvayi_collection_itemsRelations = tables.collection_itemsRelations;
export const dvayi_puzzle_redirectsRelations = tables.redirectsRelations;
export const dvayi_puzzle_attachmentsRelations = tables.attachmentsRelations;
export const dvayi_puzzle_gameplay_sessionsRelations = tables.sessionsRelations;
export const dvayi_puzzle_gameplay_statsRelations = tables.gameplay_statsRelations;
