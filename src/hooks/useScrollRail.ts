'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDragScroll } from './useDragScroll';

/**
 * Native horizontal rail (touch, trackpad, wheel, scrollbar) plus mouse drag via
 * `useDragScroll`, with prev/next state and the index of the left-most visible item.
 * Items are the rail's direct children; the rail must be `relative` so their offsets are
 * measured against it.
 */
const railItems = (el: HTMLElement) =>
  Array.from(el.children).filter((child) => child instanceof HTMLElement);

export function useScrollRail<T extends HTMLElement>() {
  const { ref, dragging } = useDragScroll<T>();
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = el.scrollWidth - el.clientWidth;
        setCanPrev(el.scrollLeft > 1);
        setCanNext(el.scrollLeft < max - 1);
        const items = railItems(el);
        const origin = items[0]?.offsetLeft ?? 0;
        // Closest item start to the current scroll position; the last item wins at the end.
        let index = 0;
        let best = Infinity;
        items.forEach((item, i) => {
          const distance = Math.abs(item.offsetLeft - origin - el.scrollLeft);
          if (distance < best) {
            best = distance;
            index = i;
          }
        });
        setActive(el.scrollLeft >= max - 1 ? items.length - 1 : index);
      });
    };
    sync();
    el.addEventListener('scroll', sync, { passive: true });
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('scroll', sync);
      observer.disconnect();
    };
  }, [ref]);

  const scrollToIndex = useCallback(
    (index: number) => {
      const el = ref.current;
      if (!el) return;
      const items = railItems(el);
      const item = items[index];
      const first = items[0];
      if (!item || !first) return;
      el.scrollTo({ left: item.offsetLeft - first.offsetLeft, behavior: 'smooth' });
    },
    [ref]
  );

  /** Page by one viewport (minus a peek) in either direction. */
  const scrollPage = useCallback(
    (direction: 1 | -1) => {
      const el = ref.current;
      if (!el) return;
      el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: 'smooth' });
    },
    [ref]
  );

  return { ref, dragging, canPrev, canNext, active, scrollToIndex, scrollPage };
}
