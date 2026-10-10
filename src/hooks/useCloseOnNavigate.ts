'use client';

import { useLayoutEffect, useRef } from 'react';
import { useRouterState } from '@tanstack/react-router';

/** Drop layout-persisted popovers/dialogs when the route changes. */
export function useCloseOnNavigate(onClose: () => void) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const onCloseRef = useRef(onClose);

  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  useLayoutEffect(() => {
    onCloseRef.current();
  }, [pathname]);
}
