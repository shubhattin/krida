import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { CrosswordMenuItems } from '~/components/app-bar/GameMenuItems';
import { HubFooter } from '~/components/hub/HubFooter';
import { HubHeader } from '~/components/hub/HubHeader';
import { getUserSession$ } from '@/lib/get_auth_from_cookie';

export const Route = createFileRoute('/padajala/(auth)/_auth')({
  beforeLoad: async () => {
    const session = await getUserSession$();
    if (!session?.user || session.user.role !== 'admin') {
      throw redirect({ to: '/padajala' });
    }
    return { session };
  },
  component: AuthLayout
});

function AuthLayout() {
  return (
    <div className="public-canvas flex min-h-dvh flex-col">
      <HubHeader gameMenuItems={<CrosswordMenuItems />} />
      <div className="mx-2 flex-1">
        <Outlet />
      </div>
      <HubFooter />
    </div>
  );
}
