'use client';

import { type PostHog } from 'posthog-js';
import { useEffect, useRef } from 'react';
import { useSession } from '~/lib/auth-client';
import { isPostHogEnabled } from '~/lib/posthog-error';

export function posthogBrowserOptions(hostname: string) {
  return {
    api_host: import.meta.env.VITE_POSTHOG_URL,
    person_profiles: 'identified_only' as const,
    ui_host: 'https://us.posthog.com',
    capture_exceptions: true,
    tracing_headers: [hostname],
    session_recording: { maskAllInputs: true }
  };
}

function browserPostHogEnabled(): boolean {
  return (
    isPostHogEnabled(import.meta.env) &&
    !import.meta.env.DEV &&
    window.location.hostname !== 'localhost'
  );
}

let clientPromise: Promise<PostHog | undefined> | undefined;

/** Lazy-load the existing browser client. No-ops outside production or without a key. */
export const load_posthog = (func?: (posthog: PostHog) => void): Promise<void> => {
  if (!browserPostHogEnabled()) return Promise.resolve();

  clientPromise ??= import('posthog-js').then((mod) => {
    const posthog = mod.default;
    posthog.init(import.meta.env.VITE_POSTHOG_KEY, posthogBrowserOptions(window.location.hostname));
    return posthog;
  });

  return clientPromise.then((posthog) => {
    if (posthog && func) func(posthog);
  });
};

/** Clear the identified browser person. Safe to call when PostHog is disabled. */
export function resetPosthog(): Promise<void> {
  return load_posthog((posthog) => {
    posthog.reset();
  });
}

export default function PosthogInit() {
  const { data: session, isPending } = useSession();
  const userId = session?.user.id;
  const email = session?.user.email;
  const identifiedUserId = useRef<string | null>(null);

  useEffect(() => {
    void load_posthog();
  }, []);

  useEffect(() => {
    if (isPending) return;

    if (userId) {
      identifiedUserId.current = userId;
      void load_posthog((posthog) => {
        posthog.identify(userId, email ? { email } : undefined);
      });
      return;
    }

    if (identifiedUserId.current) {
      identifiedUserId.current = null;
      void resetPosthog();
    }
  }, [isPending, userId, email]);

  return null;
}
