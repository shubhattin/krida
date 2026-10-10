'use client';

import type { KeyboardEvent } from 'react';
import { LanguageIcon } from '~/components/icons';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import Icon from '~/tools/Icon';

export function isLipiToggleKey(event: KeyboardEvent) {
  return (
    event.altKey &&
    (event.key === 'x' || event.key === 'X' || event.key === 'c' || event.key === 'C')
  );
}

export function LipiLekhikaSwitch({
  checked,
  onCheckedChange,
  label
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <Label className="inline-flex items-center gap-1.5">
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
      <Icon src={LanguageIcon} className="size-5" />
    </Label>
  );
}
