import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { getUserSession$ } from '~/lib/get_auth_from_cookie';

export const Route = createFileRoute('/padavali/(auth)/_auth')({
  beforeLoad: async () => {
    const session = await getUserSession$();
    if (!session?.user || session.user.role !== 'admin') {
      // guards the whole /padavali/(auth) route group
      throw redirect({ to: '/' });
    }
    return { session };
  },
  component: AuthLayout
});

function AuthLayout() {
  return <Outlet />;
}
