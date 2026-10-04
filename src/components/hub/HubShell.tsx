import type { ReactNode } from 'react';
import { AllGamesMenuItems } from '~/components/app-bar/GameMenuItems';
import { HubHeader } from './HubHeader';
import { HubFooter } from './HubFooter';

/** Shared chrome for the unified hub pages. */
export default function HubShell({ children }: { children: ReactNode }) {
  return (
    <div className="public-canvas flex min-h-dvh flex-col text-foreground">
      {/* Admin menu items render only for admins, so visitors see no change. */}
      <HubHeader showPwaControls gameMenuItems={<AllGamesMenuItems />} />
      <main className="flex-1">{children}</main>
      <HubFooter showPwa />
    </div>
  );
}
