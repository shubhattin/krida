import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { SCRIPT_DATA_COOKIE_KEY } from '~/state/script_list';
import { get_lang_from_cookie } from '~/state/script_font_data';
import get_seesion_from_cookie from '~/lib/get_auth_from_cookie';

/**
 * A cached function to get the user's session.
 * It will only be executed once per request.
 * Any component can call this function to get the session data.
 */
export const getCachedSession = cache(async () => {
  const cookieHeader = (await headers()).get('cookie') ?? '';
  const session = await get_seesion_from_cookie(cookieHeader);
  return session;
});

/**
 * A cached function to get the user's script/language preference.
 * It will only be executed once per request.
 */
export const getCachedScript = cache(async () => {
  const cookieValue = (await cookies()).get(SCRIPT_DATA_COOKIE_KEY)?.value;
  const script = get_lang_from_cookie(cookieValue);
  return script;
});
