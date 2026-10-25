import { describe, expect, it } from 'vitest';
import {
  buildMentionIndex,
  findMentionTrigger,
  foldSearchText,
  searchMentions,
  type MentionablePuzzle
} from './mention_search';

const puzzle = (
  id: number,
  kind: MentionablePuzzle['kind'],
  slug: string,
  title: string,
  description = ''
): MentionablePuzzle => ({ id, kind, slug, title, description, listed: true });

// Newest first, like the API.
const PUZZLES = [
  puzzle(5, 'dvayi', 'parvati-pairs', 'पार्वती युग्म'),
  puzzle(4, 'padavali', 'shiva-names', 'शिव नामानि', 'पार्वती के पति'),
  puzzle(3, 'padavali', 'parvati-vivaha', 'पार्वती विवाह'),
  puzzle(2, 'anveshi', 'krida-quiz', 'Krīḍā Quiz'),
  puzzle(1, 'padavali', 'rama', 'राम')
];
const NORMAL = {
  titles: ['pArvatI yugma', 'shiva nAmAni', 'pArvatI vivAha', 'Krīḍā Quiz', 'rAma'],
  descriptions: ['', 'pArvatI ke pati', '', '', '']
};
const index = buildMentionIndex(PUZZLES, NORMAL);

const search = (query: string, extra: Partial<Parameters<typeof searchMentions>[1]> = {}) =>
  searchMentions(index, {
    query,
    game: 'all',
    preferGame: null,
    exclude: new Set(),
    limit: 40,
    ...extra
  }).results.map((entry) => entry.id);

describe('findMentionTrigger', () => {
  it('finds the query after a word-starting @', () => {
    expect(findMentionTrigger('make part 2 of @parv', 20)).toEqual({ start: 15, query: 'parv' });
    expect(findMentionTrigger('@', 1)).toEqual({ start: 0, query: '' });
  });

  it('allows single spaces in the query', () => {
    expect(findMentionTrigger('@parvati viv', 12)).toEqual({ start: 0, query: 'parvati viv' });
  });

  it('ignores emails, leading or double spaces and line breaks', () => {
    expect(findMentionTrigger('mail a@b', 8)).toBeNull();
    expect(findMentionTrigger('@ parvati', 9)).toBeNull();
    expect(findMentionTrigger('@parvati  x', 11)).toBeNull();
    expect(findMentionTrigger('@parvati\nnext', 13)).toBeNull();
  });

  it('only reads text before the caret', () => {
    expect(findMentionTrigger('@rama and more', 5)).toEqual({ start: 0, query: 'rama' });
  });
});

describe('searchMentions', () => {
  it('matches romanized text against Devanagari titles', () => {
    expect(search('parvati')).toEqual([5, 3, 4]);
  });

  it('ranks title hits above description hits', () => {
    // #4 only mentions पार्वती in its description.
    expect(search('parvati').at(-1)).toBe(4);
  });

  it('puts the chat game first when every game is shown', () => {
    expect(search('parvati', { preferGame: 'padavali' })).toEqual([3, 4, 5]);
  });

  it('needs every word, in any field', () => {
    expect(search('parvati vivaha')).toEqual([3]);
    expect(search('shiva pati')).toEqual([4]);
  });

  it('matches Latin titles without diacritics, slugs, ids and Devanagari input', () => {
    expect(search('krida')).toEqual([2]);
    expect(search('shiva-names')).toEqual([4]);
    expect(search('#1')).toEqual([1]);
    expect(search('राम')).toEqual([1]);
  });

  it('filters by game and skips mentioned puzzles', () => {
    expect(search('', { game: 'padavali' })).toEqual([4, 3, 1]);
    expect(search('parvati', { exclude: new Set(['dvayi:5']) })).toEqual([3, 4]);
  });

  it('lists newest first for an empty query', () => {
    expect(search('')).toEqual([5, 4, 3, 2, 1]);
  });
});

describe('foldSearchText', () => {
  it('lowercases and strips Latin diacritics', () => {
    expect(foldSearchText('Krīḍā ĀNVEṢĪ')).toBe('krida anvesi');
  });
});
