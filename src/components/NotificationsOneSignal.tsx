'use client';

import { useEffect } from 'react';
import OneSignal from 'react-onesignal';

export default function Page() {
  useEffect(() => {
    // Ensure this code runs only on the client side
    if (
      typeof window !== 'undefined' &&
      process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID &&
      process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID
    ) {
      OneSignal.init({
        appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
        safari_web_id: process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID,
        // @ts-ignore
        notifyButton: {
          enable: true
        },
        serviceWorkerPath: '/onesignal/OneSignalSDKWorker.js'
      });
    }
  }, []);

  return <></>;
}
