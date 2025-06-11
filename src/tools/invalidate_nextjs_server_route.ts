'use server';

import { revalidatePath } from 'next/cache';

export async function invalidatePage(route: string) {
  revalidatePath(route);

  return true;
}
