'use client';

import { useEffect, useState } from 'react';
import { is_ios_atom, is_ios_safari_atom, pwa_state_atom } from './pwa_state';
import { useAtom } from 'jotai';
import { LogIn, Share, Smartphone } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '~/components/ui/alert-dialog';
import { motion } from 'framer-motion';

export default function PWAInit() {
  const [, setPwaState] = useAtom(pwa_state_atom);

  useEffect(() => {
    // Register service worker
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered successfully:', registration);
        } catch (error) {
          console.log('Service Worker registration failed:', error);
        }
      }
    };

    registerServiceWorker();

    // Check if the app is installed (running in standalone mode)
    const checkInstallStatus = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isWebAppCapable = (window.navigator as any).standalone; // iOS Safari
      const isInstalled = isStandalone || isWebAppCapable;

      setPwaState((prev) => ({ ...prev, is_installed: isInstalled }));
    };

    // Check initial install status
    checkInstallStatus();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => {
      checkInstallStatus();
    };

    mediaQuery.addEventListener('change', handleDisplayModeChange);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPwaState((prev) => ({
        ...prev,
        event_triggerer: event,
        install_event_fired: true
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [setPwaState]);

  return null;
}

export const PWAInstallButton = ({ setOpen }: { setOpen?: (v: boolean) => void }) => {
  const [pwa_state] = useAtom(pwa_state_atom);
  const [isIos] = useAtom(is_ios_atom);
  const [isIosSafari] = useAtom(is_ios_safari_atom);
  const [isIosOpen, setIsIosOpen] = useState(false);

  const handleInstall = async () => {
    if (isIos) {
      setIsIosOpen(true);
    } else {
      setOpen && setOpen(false);
      if (pwa_state.event_triggerer) pwa_state.event_triggerer.prompt();
    }
  };

  const handleIosInstall = async () => {
    setIsIosOpen(false);
    setOpen && setOpen(false);

    // IMPORTANT: navigator.share() does NOT include "Add to Home Screen"
    //
    // The Web Share API is only for sharing content TO other apps (Twitter, Messages, etc.)
    // PWA installation on iOS ONLY works through Safari's native share button in the toolbar
    //
    // There is no programmatic way to trigger PWA installation on iOS.
    // Users must manually use: Safari toolbar → Share button → "Add to Home Screen"
  };

  const showInstallButton = (pwa_state.install_event_fired || isIos) && !pwa_state.is_installed;
  if (!showInstallButton) return null;

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
    >
      <button
        onClick={handleInstall}
        className="flex w-full items-center gap-3 rounded-lg border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-3 text-left text-sm font-medium text-green-700 transition-all duration-200 hover:scale-[1.02] hover:border-green-300 hover:from-green-100 hover:to-emerald-100 hover:shadow-md active:scale-[0.98] dark:border-green-800 dark:from-green-950/30 dark:to-emerald-950/30 dark:text-green-300 dark:hover:border-green-700 dark:hover:from-green-900/40 dark:hover:to-emerald-900/40"
        title="Install PWA App for offline access"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 shadow-sm">
          <LogIn className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Install App</div>
          <div className="text-xs text-green-600 dark:text-green-400">For Quick Access</div>
        </div>
      </button>

      {isIos && (
        <AlertDialog open={isIosOpen} onOpenChange={setIsIosOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Install Padavali App
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3 text-left">
                {/* {isIosSafari ? ( */}
                <div className="space-y-3">
                  <p>To install Padavali as an app on your iPhone/iPad:</p>
                  <div className="space-y-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
                    <div className="flex items-start gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                        1
                      </span>
                      <div className="flex items-center gap-2">
                        <span>Tap Safari/Chrome share button</span>
                        <Share className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                        2
                      </span>
                      <span>
                        Scroll down and select <strong>"Add to Home Screen"</strong>
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                        3
                      </span>
                      <span>
                        Tap <strong>"Add"</strong> to confirm
                      </span>
                    </div>
                  </div>
                </div>
                {/* ) : (
                  <div className="space-y-3">
                    <p>To install Padavali as an app:</p>
                    <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
                      <p className="text-sm">
                        Please open this page in <strong>Safari</strong> to install the app. Other
                        browsers on iOS don't support PWA installation.
                      </p>
                      <p className="mt-2 text-sm">
                        Use Safari's share button → "Add to Home Screen"
                      </p>
                    </div>
                  </div>
                )} */}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={handleIosInstall}>Got it!</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </motion.div>
  );
};
