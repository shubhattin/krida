import get_seesion_from_cookie from '@/lib/get_auth_from_cookie';

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
