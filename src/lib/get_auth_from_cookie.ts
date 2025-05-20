import type { authClient } from '@/lib/auth-client';

const get_seesion_from_cookie = async (cookie: string) => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/api/auth/get-session`, {
      method: 'GET',
      headers: {
        Cookie: cookie
      }
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch session: ${res.statusText}`);
    }
    const session = (await res.json()) as typeof authClient.$Infer.Session;
    return session;
  } catch (e) {
    return null;
  }
};

export default get_seesion_from_cookie;
