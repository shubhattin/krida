'use client';

import { useEffect, useRef, useState } from 'react';

const DRAG_THRESHOLD = 5;
const FRICTION = 0.92;
/** How far (ms of travel at release speed) a fling carries before picking the snap target. */
const FLING_PROJECTION_MS = 220;
/** A gesture this far past the start item always advances one item, even if slow. */
const ADVANCE_PX = 48;
/** Trackpads send no "gesture ended" event — this much wheel silence ends the swipe. */
const WHEEL_IDLE_MS = 110;
const WHEEL_LINE_PX = 16;

/**
 * Scroll offsets the browser snaps to (`snap-start`): each child's offset minus the rail's
 * scroll-padding, clamped to the scroll range. The rail must be `relative`.
 */
export function snapStops(el: HTMLElement) {
  const items = Array.from(el.children).filter((child) => child instanceof HTMLElement);
  const padding = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
  const max = el.scrollWidth - el.clientWidth;
  return items.map((item) => Math.min(max, Math.max(0, item.offsetLeft - padding)));
}

function nearestIndex(stops: number[], position: number) {
  let index = 0;
  stops.forEach((stop, i) => {
    if (Math.abs(stop - position) < Math.abs(stops[index]! - position)) index = i;
  });
  return index;
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * Click-and-drag (mouse) and two-finger swipe (trackpad) scrolling for horizontal rails.
 * Touch keeps native scrolling, which mobile browsers already animate between snap points;
 * vertical wheel input is left alone so the page still scrolls. A drag never triggers the
 * click of the element it was released over.
 *
 * During a gesture the row follows the pointer 1:1 with scroll-snap paused on the element
 * (via React state it lagged a frame, so the browser snapped back mid-drag; and native snap
 * on wheel input jumps between cards with no transition). When the gesture ends, snap rails
 * (`snap-x`) ease to the projected item and only then re-enable snap; other rails get a
 * momentum glide.
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
    let gestureStart = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;
    let pointerId: number | null = null;
    let moved = false;
    let wheeling = false;
    let frame = 0;
    let wheelTimer: ReturnType<typeof setTimeout> | undefined;

    // Rails declare snap with static classes, so read it once before any inline override.
    const snapping = getComputedStyle(el).scrollSnapType.startsWith('x');

    /** Stop any glide and hand the rail to a new gesture starting at the current offset. */
    const takeOver = () => {
      cancelAnimationFrame(frame);
      el.style.scrollSnapType = 'none';
      gestureStart = el.scrollLeft;
      lastT = performance.now();
      velocity = 0;
    };

    const finish = () => {
      cancelAnimationFrame(frame);
      el.style.scrollSnapType = '';
      setDragging(false);
    };

    /** Ease to `target` (duration grows with distance) and then restore snap. */
    const animateTo = (target: number) => {
      const from = el.scrollLeft;
      const distance = target - from;
      if (Math.abs(distance) < 1) {
        finish();
        return;
      }
      const duration = Math.min(560, Math.max(260, Math.abs(distance) * 0.6));
      const start = performance.now();
      const step = (now: number) => {
        // rAF timestamps can precede `start` by a frame; a negative t would ease backwards.
        const t = Math.min(1, Math.max(0, (now - start) / duration));
        el.scrollLeft = from + distance * easeOutCubic(t);
        if (t < 1) frame = requestAnimationFrame(step);
        else finish();
      };
      frame = requestAnimationFrame(step);
    };

    /** Gesture over: pick the item the fling points at (or glide freely without snap). */
    const settle = (releaseVelocity: number) => {
      if (snapping) {
        // Items sharing the end-clamped stop collapse so "advance one" always moves.
        const stops = [...new Set(snapStops(el))];
        const from = nearestIndex(stops, gestureStart);
        let target = nearestIndex(stops, el.scrollLeft - releaseVelocity * FLING_PROJECTION_MS);
        const travelled = gestureStart - el.scrollLeft;
        if (target === from && Math.abs(travelled) > ADVANCE_PX) {
          target = Math.min(stops.length - 1, Math.max(0, from + Math.sign(travelled)));
        }
        animateTo(stops[target] ?? el.scrollLeft);
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
        frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };

    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      pointerId = event.pointerId;
      startX = lastX = event.clientX;
      moved = false;
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      if (!moved) {
        if (Math.abs(event.clientX - startX) < DRAG_THRESHOLD) return;
        moved = true;
        // Grabbing mid-glide takes over from wherever the rail is now, without a jump.
        takeOver();
        startX = lastX = event.clientX;
        el.setPointerCapture(event.pointerId);
        setDragging(true);
      }
      const dx = event.clientX - startX;
      const now = performance.now();
      velocity = (event.clientX - lastX) / Math.max(1, now - lastT);
      lastX = event.clientX;
      lastT = now;
      el.scrollLeft = gestureStart - dx;
    };

    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      if (!moved) return;
      // A pause before letting go means no fling.
      settle(performance.now() - lastT < 80 ? velocity : 0);
    };

    const onWheel = (event: WheelEvent) => {
      // Horizontal intent only — vertical wheels and pinch-zoom (ctrl) keep their defaults.
      if (event.ctrlKey || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      event.preventDefault();
      if (!wheeling) {
        wheeling = true;
        takeOver();
      }
      const delta = event.deltaMode === 1 ? event.deltaX * WHEEL_LINE_PX : event.deltaX;
      const now = performance.now();
      // Wheel deltas are in scroll direction; keep velocity in pointer terms like a drag.
      velocity = -delta / Math.max(8, now - lastT);
      lastT = now;
      el.scrollLeft = Math.min(max, Math.max(0, el.scrollLeft + delta));
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        wheeling = false;
        // Trackpad momentum tails off before the timeout, so the last speed is the fling.
        settle(velocity * 0.5);
      }, WHEEL_IDLE_MS);
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
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('click', onClick, true);
    el.addEventListener('dragstart', onDragStart);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(wheelTimer);
      el.style.scrollSnapType = '';
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('click', onClick, true);
      el.removeEventListener('dragstart', onDragStart);
    };
  }, []);

  return { ref, dragging };
}
