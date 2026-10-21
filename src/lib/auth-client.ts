import { createAuthClient } from 'better-auth/react';
import { adminClient, oneTapClient } from 'better-auth/client/plugins';
import { userInfoPluginClient } from './auth_plugins/user_info/client';

/** Same public OAuth client id tsc-users verifies One Tap tokens against. */
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL ?? 'http://localhost:5173',
  plugins: [
    // usernameClient(),
    adminClient(),
    userInfoPluginClient(),
    oneTapClient({
      clientId: GOOGLE_CLIENT_ID,
      // Our guest-prompt policy owns pacing: no plugin re-prompts after a dismissal.
      // fedCM keeps `preventSilentAccess()` on sign-out (GIS itself always uses FedCM now).
      promptOptions: { maxAttempts: 0, fedCM: true },
      // No silent sign-in — signing in is always an explicit tap.
      autoSelect: false,
      context: 'use',
      // Safari/Firefox "welcome page → popup" detour is clunkier than our own popup.
      // FedCM opt-in is explicit so GIS stops warning about legacy prompt status methods.
      additionalOptions: { itp_support: false, use_fedcm_for_prompt: true }
    })
  ]
});

export const { useSession, signIn, signOut, signUp } = authClient;

/** Re-read the session after a sign-in that did not reload the page. */
export function refreshAuthSession() {
  authClient.$store.notify('$sessionSignal');
}
