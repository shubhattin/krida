'use client';

import { useEffect } from 'react';
import OneSignal from 'react-onesignal';

export default function Page() {
  useEffect(() => {
    // Ensure this code runs only on the client side
    if (
      process.env.NODE_ENV === 'production' &&
      typeof window !== 'undefined' &&
      process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID &&
      process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID
    ) {
      OneSignal.init({
        appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
        safari_web_id: process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID,
        // @ts-ignore
        notifyButton: {
          enable: false
        },
        serviceWorkerParam: {
          scope: '/onesignal/'
        },
        serviceWorkerPath: 'onesignal/OneSignalSDKWorker.js',
        promptOptions: {
          // @ts-ignore
          customlink: {
            enabled: true,
            style: 'button',
            size: 'medium',
            color: {
              button: '#E12D30', // button background color
              text: '#FFFFFF' // button text color
            },
            text: {
              subscribe: '🔔 Subscribe to Padavali notifications'
              // explanation: 'Subscribe to get notified for new Padavali puzzles'
            },
            unsubscribeEnabled: false
          }
        },
        welcomeNotification: {
          disable: false,
          message: '🎉 You are Successfully Subscribed to Padavali Updates! 🧩',
          title: '👋 Welcome!',
          url: 'https://krida.thesanskritchannel.org/padavali' // Optional
        }
      });
    }
  }, []);

  return <></>;
}
