'use server';

import { revalidatePath } from 'next/cache';
import { getCachedSession } from '~/lib/cache_server_route_data';

const ALLOWED_INVALIDATION_PREFIXES = ['/padavali', '/padajala'];

export async function invalidatePage(route: string) {
  const session = await getCachedSession();
  if (!session || session.user.role !== 'admin') {
    return false;
  }

  const isAllowedRoute = ALLOWED_INVALIDATION_PREFIXES.some(
    (prefix) => route === prefix || route.startsWith(`${prefix}/`)
  );
  if (!isAllowedRoute) {
    return false;
  }

  revalidatePath(route);

  return true;
}
