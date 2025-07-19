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

export const is_ios_atom = atom<boolean>(false);
