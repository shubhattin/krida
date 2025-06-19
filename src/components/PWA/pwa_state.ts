import { atom } from 'jotai';

export const pwa_state_atom = atom<{
  install_event_fired: boolean;
  event_triggerer: any;
}>({
  install_event_fired: false,
  event_triggerer: null
});
