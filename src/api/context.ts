import ky from 'ky';
import type { authClient } from '@/lib/auth-client';

export const get_seesion_from_cookie = async (cookie: string) => {
  try {
    const session = await ky
      .get<typeof authClient.$Infer.Session>(
        `${process.env.NEXT_BETTER_AUTH_URL}/api/auth/get-session`,
        {
          headers: {
            Cookie: cookie
          }
        }
      )
      .json();
    return session;
  } catch (e) {
    return null;
  }
};

export const createContext = async ({ req }: { req: Request }) => {
  const cookie = req.headers.get('cookie') ?? '';
  const session = await get_seesion_from_cookie(cookie);
  const user = session?.user;

  return {
    user,
    cookie
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
