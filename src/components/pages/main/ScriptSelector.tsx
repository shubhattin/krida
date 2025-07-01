'use client';

import {
  SCRIPT_DATA_COOKIE_KEY,
  SCRIPT_LIST,
  SCRIPT_NAMES,
  type ScriptType
} from '~/state/script_list';
import Cookies from 'js-cookie';
import { cn } from '~/lib/utils';
import { useEffect } from 'react';
import { load_posthog } from '~/components/tags/PosthogInit';

type Props = {
  script: ScriptType;
  onScriptChange: (script: ScriptType) => void;
};

export const ScriptSelector = ({ script, onScriptChange }: Props) => {
  useEffect(() => {
    load_posthog((posthog) => {
      posthog.capture('gameplay_script', { script: script });
    });
  }, [script]);

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
          onScriptChange(e.target.value as ScriptType);
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
              Cookies.set(SCRIPT_DATA_COOKIE_KEY, s, {
                expires: 365 // 1 year
              });
            }}
          >
            {SCRIPT_NAMES[s as ScriptType]}
          </option>
        ))}
      </select>
    </>
  );
};
