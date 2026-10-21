'use client';

import { useEffect, useRef, useState } from 'react';

const DRAG_THRESHOLD = 5;
const FRICTION = 0.92;

/**
 * Mouse click-and-drag horizontal scrolling for overflow rows (carousel feel), with a short
 * momentum glide. Touch and trackpads keep native scrolling. A drag never triggers the click
 * of the element it was released over.
 *
 * Spread `dragging` into the row's classes to drop `snap-x` / show `cursor-grabbing` mid-drag.
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
    let glide = 0;

    const stopGlide = () => cancelAnimationFrame(glide);

    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      stopGlide();
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
      // Momentum: keep travelling with the release speed, decaying each frame. `dragging`
      // stays on until the glide ends so scroll-snap only kicks in once the row settles.
      let speed = performance.now() - lastT < 80 ? -velocity * 16 : 0;
      const step = () => {
        if (Math.abs(speed) < 0.5) {
          setDragging(false);
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
      stopGlide();
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
