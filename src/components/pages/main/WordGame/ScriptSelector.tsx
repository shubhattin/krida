'use client';

import { SCRIPT_DATA_COOKIE_KEY, SCRIPT_LIST, type ScriptType } from '~/state/script_font_data';
import Cookies from 'js-cookie';
import { cn } from '~/lib/utils';
import { useAtom } from 'jotai';
import { script_atom } from '~/state/main.state';

export const ScriptSelector = () => {
  const [script, setScript] = useAtom(script_atom);

  return (
    <>
      <select
        value={script}
        className={cn(
          'select rounded-md border border-gray-300 bg-white text-gray-700 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none',
          'bg-white dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-blue-500 dark:focus:ring-blue-500',
          'w-28 px-2 py-1 text-xs'
        )}
        onChange={(e) => {
          setScript(e.target.value as ScriptType);
          Cookies.set(SCRIPT_DATA_COOKIE_KEY, e.target.value, {
            expires: 365 // 1 year
          });
        }}
      >
        {SCRIPT_LIST.map((s) => (
          <option
            key={s}
            value={s}
            onClick={() => {
              setScript(s as ScriptType);
              Cookies.set(SCRIPT_DATA_COOKIE_KEY, s, {
                expires: 365 // 1 year
              });
            }}
          >
            {s}
          </option>
        ))}
      </select>
    </>
  );
};
