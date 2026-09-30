import { createFileRoute, Outlet } from '@tanstack/react-router';
import { CrosswordMenuItems } from '~/components/app-bar/GameMenuItems';
import { HubGamePublicShell } from '~/components/hub/HubShell';

export const Route = createFileRoute('/padajala/(public)/_public')({
  component: PublicLayout
});

function PublicLayout() {
  return (
    <HubGamePublicShell currentGame="crossword" gameMenuItems={<CrosswordMenuItems />}>
      <Outlet />
    </HubGamePublicShell>
  );
}
