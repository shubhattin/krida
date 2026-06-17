'use client';

import {
  SCRIPT_DATA_COOKIE_KEY,
  SCRIPT_LIST_ANCIENT,
  SCRIPT_LIST_MAIN,
  SCRIPT_NAMES,
  type ScriptType
} from '~/state/script_list';
import Cookies from 'js-cookie';
import { useEffect } from 'react';
import { load_posthog } from '~/components/tags/PosthogInit';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select';

const SCRIPT_ITEMS = [
  ...SCRIPT_LIST_MAIN.map((script) => ({
    label: SCRIPT_NAMES[script],
    value: script
  })),
  ...SCRIPT_LIST_ANCIENT.map((script) => ({
    label: SCRIPT_NAMES[script],
    value: script
  }))
];

type Props = {
  script: ScriptType;
  onScriptChange: (script: ScriptType) => void;
};

export const ScriptSelector = ({ script, onScriptChange }: Props) => {
  useEffect(() => {
    load_posthog((posthog) => {
      posthog.capture('gameplay_script', { script });
    });
  }, [script]);

  const handleScriptChange = (value: ScriptType | null) => {
    if (!value) return;

    onScriptChange(value);
    Cookies.set(SCRIPT_DATA_COOKIE_KEY, value, {
      expires: 365
    });
  };

  return (
    <Select items={SCRIPT_ITEMS} value={script} onValueChange={handleScriptChange}>
      <SelectTrigger size="sm" className="w-28 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        <SelectGroup>
          {SCRIPT_LIST_MAIN.map((scriptKey) => (
            <SelectItem key={scriptKey} value={scriptKey}>
              {SCRIPT_NAMES[scriptKey]}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Ancient Scripts</SelectLabel>
          {SCRIPT_LIST_ANCIENT.map((scriptKey) => (
            <SelectItem key={scriptKey} value={scriptKey}>
              {SCRIPT_NAMES[scriptKey]}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
