import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import AppBar from '~/components/app-bar/AppBar';
import { CrosswordMenuItems } from '~/components/app-bar/GameMenuItems';
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
    <>
      <AppBar game="crossword" gameMenuItems={<CrosswordMenuItems />} />
      <div className="mx-2">
        <Outlet />
      </div>
    </>
  );
}
