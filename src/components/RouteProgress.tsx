'use client';

import { useRouter, useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';

export function RouteProgress() {
  const router = useRouter();
  const status = useRouterState({ select: (state) => state.status });
  const [progress, setProgress] = useState(0);
  const [opacity, setOpacity] = useState(0);
  const [settling, setSettling] = useState(false);
  const finishRef = useRef<() => void>(() => {});
  const sawPendingRef = useRef(false);

  useEffect(() => {
    let progressValue = 0;
    let generation = 0;
    let running = false;
    let finishing = 0;
    let raf = 0;
    let hideTimer = 0;

    function cancelRaf() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    function clearHide() {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = 0;
    }

    function reducedMotion() {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function tick() {
      const cap = 0.9;
      const remaining = cap - progressValue;
      const pace = progressValue < 0.35 ? 0.07 : 0.02;
      progressValue = Math.min(cap, progressValue + Math.max(remaining * pace, 0.0015));
      setProgress(progressValue);
      if (progressValue < cap - 0.001) raf = requestAnimationFrame(tick);
      else raf = 0;
    }

    function begin() {
      const gen = ++generation;
      clearHide();
      cancelRaf();
      running = true;
      finishing = 0;
      sawPendingRef.current = false;
      setSettling(false);
      setOpacity(1);
      progressValue = reducedMotion() ? 1 : 0.08;
      setProgress(progressValue);
      if (!reducedMotion()) raf = requestAnimationFrame(tick);
      return gen;
    }

    function finish(gen: number) {
      if (gen !== generation || !running || finishing === gen) return;
      finishing = gen;
      cancelRaf();

      // Two frames so the started bar paints before the completion transition,
      // including when the destination was already preloaded.
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => {
          if (gen !== generation) return;
          running = false;

          if (reducedMotion()) {
            setOpacity(0);
            setSettling(false);
            progressValue = 0;
            setProgress(0);
            return;
          }

          setSettling(true);
          progressValue = 1;
          setProgress(1);
          setOpacity(0);
          hideTimer = window.setTimeout(() => {
            if (gen !== generation) return;
            hideTimer = 0;
            setSettling(false);
            progressValue = 0;
            setProgress(0);
          }, 420);
        });
      });
    }

    finishRef.current = () => {
      if (running) finish(generation);
    };

    // Client navigations only. The first load has no resolved location, and
    // leaving the document is a full page load that never emits this event.
    const unsubscribeStart = router.subscribe('onBeforeNavigate', (event) => {
      if (!event.fromLocation || !event.hrefChanged) return;
      begin();
    });

    const unsubscribeDone = router.subscribe('onResolved', () => {
      finishRef.current();
    });

    return () => {
      unsubscribeStart();
      unsubscribeDone();
      finishRef.current = () => {};
      cancelRaf();
      clearHide();
    };
  }, [router]);

  useEffect(() => {
    if (status === 'pending') {
      sawPendingRef.current = true;
      return;
    }
    if (status === 'idle' && sawPendingRef.current) {
      sawPendingRef.current = false;
      finishRef.current();
    }
  }, [status]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px]"
      style={{
        opacity,
        transition: settling ? 'opacity 200ms ease 160ms' : 'opacity 80ms ease'
      }}
      aria-hidden="true"
    >
      <div
        className="relative h-full w-full origin-left bg-primary shadow-[0_0_8px_var(--primary)]"
        style={{
          transform: `scaleX(${progress})`,
          transition: settling ? 'transform 180ms ease-out' : 'none'
        }}
      >
        <span className="absolute inset-y-0 right-0 w-16 bg-linear-to-r from-transparent to-[oklch(0.97_0.05_95)]" />
      </div>
    </div>
  );
}
