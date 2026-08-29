import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
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
  return <Outlet />;
}
