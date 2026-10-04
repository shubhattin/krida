import { Outlet, createFileRoute } from '@tanstack/react-router';
import { PadavaliMenuItems } from '~/components/app-bar/GameMenuItems';
import { HubFooter } from '~/components/hub/HubFooter';
import { HubHeader } from '~/components/hub/HubHeader';

export const Route = createFileRoute('/padavali/(public)/_public')({
  component: PublicLayout
});

function PublicLayout() {
  return (
    <div className="public-canvas flex min-h-dvh flex-col">
      <HubHeader showPwaControls gameMenuItems={<PadavaliMenuItems />} />
      <div className="flex-1">
        <Outlet />
      </div>
      <HubFooter showPwa showOneSignal />
    </div>
  );
}
