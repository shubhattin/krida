'use client';

import { useEffect, useState } from 'react';
import { is_ios_atom, pwa_state_atom } from './pwa_state';
import { useAtom } from 'jotai';
import { LogIn } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '~/components/ui/alert-dialog';

export default function PWAInit() {
  const [, setPwaState] = useAtom(pwa_state_atom);

  useEffect(() => {
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
    if (navigator?.share) {
      await navigator
        .share({
          title: 'Padavali',
          text: 'Padavali',
          url: window.location.origin + '/padavali'
        })
        .catch((err) => console.log('Error sharing:', err));
    }
  };

  return (
    <>
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
          {/* <div className="text-xs text-green-600 dark:text-green-400">
      Get offline access & faster loading
      </div> */}
        </div>
      </button>

      {isIos && (
        <AlertDialog open={isIosOpen} onOpenChange={setIsIosOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>App Installation</AlertDialogTitle>
              <AlertDialogDescription>
                Select <span className="font-bold">"Add to Home Screen"</span> in the share menu to
                install the <span className="italic">PWA</span> app.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={handleIosInstall}>Proceed</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};
