import type { AnveshiPuzzleData } from '~/util/anveshi/data';
import { defineSimpleGameTables } from './simple_game_tables';

export const anveshi_tables = defineSimpleGameTables<AnveshiPuzzleData>('anveshi');
const tables = anveshi_tables;

export const anveshi_puzzles = tables.puzzles;
export const anveshi_redirects = tables.redirects;
export const anveshi_attachments = tables.attachments;
export const anveshi_sessions = tables.sessions;
export const anveshi_gameplay_stats = tables.gameplay_stats;
export const anveshi_puzzle_tags = tables.puzzle_tags;
export const anveshi_collection_items = tables.collection_items;

export const anveshi_puzzlesRelations = tables.puzzlesRelations;
export const anveshi_puzzle_tagsRelations = tables.puzzle_tagsRelations;
export const anveshi_collection_itemsRelations = tables.collection_itemsRelations;
export const anveshi_puzzle_redirectsRelations = tables.redirectsRelations;
export const anveshi_puzzle_attachmentsRelations = tables.attachmentsRelations;
export const anveshi_puzzle_gameplay_sessionsRelations = tables.sessionsRelations;
export const anveshi_puzzle_gameplay_statsRelations = tables.gameplay_statsRelations;
