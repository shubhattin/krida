import { redirect } from '@tanstack/react-router';
import { createMiddleware } from '@tanstack/react-start';
import { getServerUserSession$ } from './get_auth_from_cookie';

export async function requireAdminAccess() {
  const session = await getServerUserSession$();

  if (!session?.user || session.user.role !== 'admin') {
    throw redirect({ to: '/' });
  }

  return {
    session,
    user: session.user
  };
}

/** Server functions behind admin routes are public endpoints; guard each one. */
export const adminServerFnMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const auth = await requireAdminAccess();

    return next({
      context: auth
    });
  }
);
