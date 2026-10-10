'use client';

import { useEffect } from 'react';
import { useRouterState } from '@tanstack/react-router';

/**
 * Base UI Select/Dialog mounts a full-viewport `InternalBackdrop` (`position:fixed; inset:0`).
 * If that node survives a route change (unmount while open, or a close animation that never
 * finishes), clicks hit the invisible layer and every control on the next page looks dead.
 */
function sweepOrphanedOverlays() {
  const openPopup = document.querySelector(
    [
      '[data-slot="dialog-content"][data-open]',
      '[data-slot="alert-dialog-content"][data-open]',
      '[data-slot="select-content"][data-open]',
      '[data-slot="popover-content"][data-open]',
      '[data-slot="dropdown-menu-content"][data-open]'
    ].join(', ')
  );
  if (openPopup) return;

  document.querySelectorAll('[data-base-ui-inert]').forEach((node) => {
    node.remove();
  });

  const body = document.body;
  const html = document.documentElement;
  body.removeAttribute('inert');
  html.removeAttribute('inert');
  if (body.style.pointerEvents === 'none') body.style.removeProperty('pointer-events');
  if (html.style.pointerEvents === 'none') html.style.removeProperty('pointer-events');
}

export function DismissOverlaysOnNavigate() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      sweepOrphanedOverlays();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
