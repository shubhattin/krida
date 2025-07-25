import { atom } from 'jotai';

export const pwa_state_atom = atom<{
  install_event_fired: boolean;
  event_triggerer: any;
  is_installed: boolean;
}>({
  install_event_fired: false,
  event_triggerer: null,
  is_installed: false
});

// Detect iOS Safari specifically (not other iOS browsers)
export const is_ios_safari_atom = atom<boolean>(() => {
  if (typeof window === 'undefined') return false;

  const userAgent = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS/.test(userAgent);

  return isIOS && isSafari;
});

export const is_ios_atom = atom<boolean>(() => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent);
});
