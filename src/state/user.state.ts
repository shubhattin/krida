import { atom } from 'jotai';
import { authClient } from '~/lib/auth-client';

export const user_info_atom = atom<(typeof authClient.$Infer.Session)['user'] | null | undefined>(
  null
);
