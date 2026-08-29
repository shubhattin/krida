import { createAuthClient } from 'better-auth/react';
import { adminClient } from 'better-auth/client/plugins';
import { userInfoPluginClient } from './auth_plugins/user_info/client';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL ?? 'http://localhost:5173',
  plugins: [
    // usernameClient(),
    adminClient(),
    userInfoPluginClient()
  ]
});

export const { useSession, signIn, signOut, signUp } = authClient;
