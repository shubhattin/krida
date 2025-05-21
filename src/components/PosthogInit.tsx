'use client';

import { useEffect } from 'react';

export default function PosthogInit() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      process.env.NEXT_PUBLIC_POSTHOG_KEY &&
      process.env.NEXT_PUBLIC_POSTHOG_URL
    ) {
      import('posthog-js').then((posthog) => {
        posthog.default.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
          api_host: `${process.env.NEXT_PUBLIC_POSTHOG_URL!}/ingest`,
          person_profiles: 'identified_only',
          ui_host: 'https://us.posthog.com'
        });
      });
    }
  }, []);
  return <></>;
}
