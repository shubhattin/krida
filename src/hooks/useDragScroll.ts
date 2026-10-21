'use client';

import { useEffect, useRef, useState } from 'react';

const DRAG_THRESHOLD = 5;
const FRICTION = 0.92;
/** How far (ms of travel at release speed) a fling carries before picking the snap target. */
const FLING_PROJECTION_MS = 220;
/** A drag this far past the start item always advances one item, even if slow. */
const ADVANCE_PX = 48;
const SETTLE_FALLBACK_MS = 700;

/** Scroll offsets the rail can snap to: each child's start, capped at the end of the rail. */
function snapStops(el: HTMLElement) {
  const items = Array.from(el.children).filter((child) => child instanceof HTMLElement);
  const origin = items[0]?.offsetLeft ?? 0;
  const max = el.scrollWidth - el.clientWidth;
  return [...new Set(items.map((item) => Math.min(max, item.offsetLeft - origin)))];
}

function nearestIndex(stops: number[], position: number) {
  let index = 0;
  stops.forEach((stop, i) => {
    if (Math.abs(stop - position) < Math.abs(stops[index]! - position)) index = i;
  });
  return index;
}

/**
 * Mouse click-and-drag horizontal scrolling for overflow rows. Touch, trackpads, wheels and
 * the scrollbar keep native scrolling. A drag never triggers the click of the element it
 * was released over.
 *
 * Snap rails (`snap-x` on the row) have scroll-snap paused on the element itself for the
 * whole gesture — toggling it through React state lagged a frame, so the browser snapped
 * back mid-drag. On release they glide to the projected item and only then re-enable snap,
 * so it never jumps. Rails without snap get a momentum glide instead.
 *
 * `dragging` is for the cursor only (`cursor-grabbing`).
 */
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let startX = 0;
    let startLeft = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;
    let pointerId: number | null = null;
    let moved = false;
    let snaps = false;
    let glide = 0;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      cancelAnimationFrame(glide);
      clearTimeout(settleTimer);
      el.removeEventListener('scrollend', finish);
      el.style.scrollSnapType = '';
      setDragging(false);
    };

    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      // Grabbing mid-glide takes over from wherever the rail is now.
      cancelAnimationFrame(glide);
      clearTimeout(settleTimer);
      el.removeEventListener('scrollend', finish);
      el.style.scrollSnapType = '';
      snaps = getComputedStyle(el).scrollSnapType !== 'none';
      pointerId = event.pointerId;
      startX = lastX = event.clientX;
      startLeft = el.scrollLeft;
      lastT = performance.now();
      velocity = 0;
      moved = false;
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      const dx = event.clientX - startX;
      if (!moved) {
        if (Math.abs(dx) < DRAG_THRESHOLD) return;
        moved = true;
        el.style.scrollSnapType = 'none';
        el.setPointerCapture(event.pointerId);
        setDragging(true);
      }
      const now = performance.now();
      velocity = (event.clientX - lastX) / Math.max(1, now - lastT);
      lastX = event.clientX;
      lastT = now;
      el.scrollLeft = startLeft - dx;
    };

    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      if (!moved) return;
      // A pause before letting go means no fling.
      const releaseVelocity = performance.now() - lastT < 80 ? velocity : 0;

      if (snaps) {
        const stops = snapStops(el);
        const from = nearestIndex(stops, startLeft);
        let target = nearestIndex(stops, el.scrollLeft - releaseVelocity * FLING_PROJECTION_MS);
        const dragged = startLeft - el.scrollLeft;
        if (target === from && Math.abs(dragged) > ADVANCE_PX) {
          target = Math.min(stops.length - 1, Math.max(0, from + Math.sign(dragged)));
        }
        el.addEventListener('scrollend', finish, { once: true });
        settleTimer = setTimeout(finish, SETTLE_FALLBACK_MS);
        el.scrollTo({ left: stops[target] ?? el.scrollLeft, behavior: 'smooth' });
        return;
      }

      let speed = -releaseVelocity * 16;
      const step = () => {
        if (Math.abs(speed) < 0.5) {
          finish();
          return;
        }
        el.scrollLeft += speed;
        speed *= FRICTION;
        glide = requestAnimationFrame(step);
      };
      glide = requestAnimationFrame(step);
    };

    // Swallow the click that ends a drag so links / buttons underneath don't fire.
    const onClick = (event: MouseEvent) => {
      if (!moved) return;
      event.preventDefault();
      event.stopPropagation();
      moved = false;
    };
    // Native image/link dragging would hijack the gesture.
    const onDragStart = (event: DragEvent) => event.preventDefault();

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('click', onClick, true);
    el.addEventListener('dragstart', onDragStart);
    return () => {
      cancelAnimationFrame(glide);
      clearTimeout(settleTimer);
      el.removeEventListener('scrollend', finish);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('click', onClick, true);
      el.removeEventListener('dragstart', onDragStart);
    };
  }, []);

  return { ref, dragging };
}
