import { Outlet, createFileRoute } from '@tanstack/react-router';
import { PWAInstallButton } from '~/components/PWA/PWAInit';
import { PadavaliMenuItems } from '~/components/app-bar/GameMenuItems';
import { HubGamePublicShell } from '~/components/hub/HubShell';

export const Route = createFileRoute('/padavali/(public)/_public')({
  component: PublicLayout
});

function PublicLayout() {
  return (
    <HubGamePublicShell
      currentGame="padavali"
      showPwaControls
      gameMenuItems={<PadavaliMenuItems />}
      extras={
        <>
          <div className="onesignal-customlink-container"></div>
          <PWAInstallButton />
        </>
      }
    >
      <Outlet />
    </HubGamePublicShell>
  );
}
