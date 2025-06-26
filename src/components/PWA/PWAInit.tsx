'use client';

import { useEffect } from 'react';
import { pwa_state_atom } from './pwa_state';
import { useAtom } from 'jotai';

export default function PWAInit() {
  const [, setPwaState] = useAtom(pwa_state_atom);
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      setPwaState({ event_triggerer: event, install_event_fired: true });
    });
  }, [setPwaState]);
  return null;
}
