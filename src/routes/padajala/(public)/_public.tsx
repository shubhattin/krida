import { createFileRoute, Outlet } from '@tanstack/react-router';
import { PadajalaMenuItems } from '~/components/app-bar/GameMenuItems';
import { HubFooter } from '~/components/hub/HubFooter';
import { HubHeader } from '~/components/hub/HubHeader';

export const Route = createFileRoute('/padajala/(public)/_public')({
  component: PublicLayout
});

function PublicLayout() {
  return (
    <div className="public-canvas flex min-h-dvh flex-col">
      <HubHeader showPwaControls gameMenuItems={<PadajalaMenuItems />} />
      <div className="flex-1">
        <Outlet />
      </div>
      <HubFooter />
    </div>
  );
}
