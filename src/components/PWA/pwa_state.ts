import { atom } from 'jotai';

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void> | void;
};

export const pwa_state_atom = atom<{
  install_event_fired: boolean;
  event_triggerer: BeforeInstallPromptEvent | null;
  is_installed: boolean;
}>({
  install_event_fired: false,
  event_triggerer: null,
  is_installed: false
});

// Detect iOS Safari specifically (not other iOS browsers)
export const is_ios_safari_atom = atom<boolean>(() => {
  // SAFETY: atoms may be evaluated during SSR, where `window` does not exist;
  // a runtime environment check for the browser global is the right tool here.
  // oxlint-disable-next-line anti-slop/no-runtime-typeof
  if (typeof window === 'undefined') return false;

  const userAgent = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS/.test(userAgent);

  return isIOS && isSafari;
});

export const is_ios_atom = atom<boolean>(() => {
  // SAFETY: atoms may be evaluated during SSR, where `window` does not exist;
  // a runtime environment check for the browser global is the right tool here.
  // oxlint-disable-next-line anti-slop/no-runtime-typeof
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent);
});
