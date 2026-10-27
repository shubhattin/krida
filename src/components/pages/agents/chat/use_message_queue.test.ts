import { describe, expect, it } from 'vitest';
import type { ComposerMessage } from './ChatComposer';
import { appendQueued, dropQueued, takeQueued } from './use_message_queue';

const message = (text: string): ComposerMessage => ({ text, refs: [] });

describe('message queue helpers', () => {
  it('appends drafts in order with unique ids', () => {
    const queue = appendQueued(appendQueued([], message('first')), message('second'));
    expect(queue.map((item) => item.text)).toEqual(['first', 'second']);
    expect(queue[0]!.id).not.toBe(queue[1]!.id);
  });

  it('drops a draft by id and keeps the rest', () => {
    const queue = appendQueued(appendQueued([], message('first')), message('second'));
    const rest = dropQueued(queue, queue[0]!.id);
    expect(rest.map((item) => item.text)).toEqual(['second']);
    // Unknown ids leave the queue untouched.
    expect(dropQueued(queue, 'missing')).toHaveLength(2);
  });

  it('takes a draft by id', () => {
    const queue = appendQueued(appendQueued([], message('first')), message('second'));
    const { item, rest } = takeQueued(queue, queue[0]!.id);
    expect(item?.text).toBe('first');
    expect(rest.map((entry) => entry.text)).toEqual(['second']);
    expect(takeQueued(queue, 'missing').item).toBeUndefined();
  });
});
