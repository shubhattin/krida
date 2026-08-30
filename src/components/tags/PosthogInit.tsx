'use client';

import { type PostHog } from 'posthog-js';
import { useEffect } from 'react';

export const load_posthog = async (func?: (posthog: PostHog) => void) => {
  // Callers are effects/async callbacks, so this always runs client-side.
  if (
    window.location.hostname === 'localhost' ||
    import.meta.env.DEV ||
    !import.meta.env.VITE_POSTHOG_KEY ||
    !import.meta.env.VITE_POSTHOG_URL
  )
    return;

  const posthog = await import('posthog-js');
  if (func) {
    func(posthog.default);
  }
};

export default function PosthogInit() {
  useEffect(() => {
    load_posthog((posthog) => {
      posthog.init(import.meta.env.VITE_POSTHOG_KEY!, {
        api_host: `${import.meta.env.VITE_POSTHOG_URL!}`,
        person_profiles: 'identified_only',
        ui_host: 'https://us.posthog.com'
      });
    });
  }, []);
  return null;
}
