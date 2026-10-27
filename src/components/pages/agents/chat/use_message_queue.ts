import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComposerMessage } from './ChatComposer';

export type QueuedMessage = ComposerMessage & { id: string };

let queuedMessageCounter = 0;

/** Client-only id (the queue is in-memory and never sent to the server). */
const nextQueuedId = () => `queued-${Date.now().toString(36)}-${(queuedMessageCounter += 1)}`;

const withId = (message: ComposerMessage): QueuedMessage => ({
  text: message.text,
  refs: [...message.refs],
  id: nextQueuedId()
});

/** Pure list helpers (unit-tested in `use_message_queue.test.ts`). */
export function appendQueued(
  queue: readonly QueuedMessage[],
  message: ComposerMessage
): QueuedMessage[] {
  return [...queue, withId(message)];
}

export function dropQueued(queue: readonly QueuedMessage[], id: string): QueuedMessage[] {
  return queue.filter((item) => item.id !== id);
}

export type TakenQueued = { item: QueuedMessage | undefined; rest: QueuedMessage[] };

export function takeQueued(queue: readonly QueuedMessage[], id: string): TakenQueued {
  const item = queue.find((entry) => entry.id === id);
  return { item, rest: item ? queue.filter((entry) => entry.id !== id) : [...queue] };
}

/**
 * In-memory per-chat queue of messages typed while a reply streams. AgentChat mounts one of
 * these per chat (keyed by chat id), so switching chats never leaks queued drafts across chats.
 */
export function useMessageQueue() {
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  // Synchronous mirror so take* can return the item in the same tick as removing it.
  const mirror = useRef<QueuedMessage[]>([]);

  const update = useCallback((next: QueuedMessage[]) => {
    mirror.current = next;
    setQueue(next);
  }, []);

  const enqueue = useCallback(
    (message: ComposerMessage) => update(appendQueued(mirror.current, message)),
    [update]
  );

  const remove = useCallback((id: string) => update(dropQueued(mirror.current, id)), [update]);

  const take = useCallback(
    (id: string) => {
      const { item, rest } = takeQueued(mirror.current, id);
      if (item) update(rest);
      return item;
    },
    [update]
  );

  const takeFirst = useCallback(() => {
    const first = mirror.current[0];
    if (first) update(mirror.current.slice(1));
    return first;
  }, [update]);

  const clear = useCallback(() => update([]), [update]);

  // Belt and braces: the instance is already per-chat, drop any draft on unmount.
  useEffect(
    () => () => {
      mirror.current = [];
    },
    []
  );

  return { queue, enqueue, remove, take, takeFirst, clear };
}
