import { createIsomorphicFn } from '@tanstack/react-start';
import { getCookie } from '@tanstack/react-start/server';
import js_cookie from 'js-cookie';
import { SCRIPT_DATA_COOKIE_KEY } from '~/state/script_list';
import { get_lang_from_cookie } from '~/state/script_font_data';

/** Script preference from cookie (SSR + client). */
export const getScript$ = createIsomorphicFn()
  .client(() => {
    const cookieValue = js_cookie.get(SCRIPT_DATA_COOKIE_KEY);
    return get_lang_from_cookie(cookieValue);
  })
  .server(() => {
    const cookieValue = getCookie(SCRIPT_DATA_COOKIE_KEY);
    return get_lang_from_cookie(cookieValue);
  });
