import type { ReactNode } from 'react';
import { AllGamesMenuItems, CollectionAdminMenuItems } from '~/components/app-bar/GameMenuItems';
import { HubHeader } from './HubHeader';
import { HubFooter } from './HubFooter';

/** Shared chrome for the unified hub pages. */
export default function HubShell({ children }: { children: ReactNode }) {
  return (
    <div className="public-canvas flex min-h-dvh flex-col text-foreground">
      {/* Collection edit (when open) first, then admin hub + shortcuts — admins only. */}
      <HubHeader
        showPwaControls
        gameMenuItems={
          <>
            <CollectionAdminMenuItems />
            <AllGamesMenuItems />
          </>
        }
      />
      <main className="flex-1">{children}</main>
      <HubFooter showPwa />
    </div>
  );
}
