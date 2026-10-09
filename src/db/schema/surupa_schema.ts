import type { SurupaPuzzleData } from '~/util/surupa/data';
import { defineSimpleGameTables } from './simple_game_tables';

export const surupa_tables = defineSimpleGameTables<SurupaPuzzleData>('surupa');
const tables = surupa_tables;

export const surupa_puzzles = tables.puzzles;
export const surupa_redirects = tables.redirects;
export const surupa_attachments = tables.attachments;
export const surupa_sessions = tables.sessions;
export const surupa_gameplay_stats = tables.gameplay_stats;
export const surupa_puzzle_tags = tables.puzzle_tags;
export const surupa_collection_items = tables.collection_items;

export const surupa_puzzlesRelations = tables.puzzlesRelations;
export const surupa_puzzle_tagsRelations = tables.puzzle_tagsRelations;
export const surupa_collection_itemsRelations = tables.collection_itemsRelations;
export const surupa_puzzle_redirectsRelations = tables.redirectsRelations;
export const surupa_puzzle_attachmentsRelations = tables.attachmentsRelations;
export const surupa_puzzle_gameplay_sessionsRelations = tables.sessionsRelations;
export const surupa_puzzle_gameplay_statsRelations = tables.gameplay_statsRelations;
