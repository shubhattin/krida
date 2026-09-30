import { Outlet, createFileRoute } from '@tanstack/react-router';
import { PadavaliMenuItems } from '~/components/app-bar/GameMenuItems';
import { HubFooter } from '~/components/hub/HubFooter';
import { HubHeader } from '~/components/hub/HubHeader';

export const Route = createFileRoute('/padavali/(public)/_public')({
  component: PublicLayout
});

function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 dark:bg-slate-950">
      <HubHeader showPwaControls gameMenuItems={<PadavaliMenuItems />} />
      <div className="mx-2 flex-1">
        <Outlet />
      </div>
      <HubFooter showPwa showOneSignal />
    </div>
  );
}
