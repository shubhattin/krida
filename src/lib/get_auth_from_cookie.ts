import ky from 'ky';
import type { authClient } from '@/lib/auth-client';

const get_seesion_from_cookie = async (cookie: string) => {
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

export default get_seesion_from_cookie;
