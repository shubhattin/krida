'use client';

import { Label } from '~/components/ui/label';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import type { RedirectConflict } from '~/hooks/useDebouncedSlugCheck';

type Props = {
  conflict: RedirectConflict;
  overrideConfirmed: boolean;
  onOverrideChange: (confirmed: boolean) => void;
};

export const SlugRedirectConflictPrompt = ({
  conflict,
  overrideConfirmed,
  onOverrideChange
}: Props) => {
  return (
    <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
      <p className="font-medium text-amber-900 dark:text-amber-200">
        This slug matches an existing redirect and an active puzzle slug cannot be reused. Choosing
        Yes only replaces that conflicting redirect — your puzzle&apos;s current slug will still
        become a redirect to the new slug when you save.
      </p>
      <ul className="list-disc space-y-1 pl-5 text-amber-800 dark:text-amber-300">
        <li>
          Redirect slug: <span className="font-mono">{conflict.redirect_slug}</span>
        </li>
        <li>
          Currently redirects to: <span className="font-semibold">{conflict.puzzle.title}</span>{' '}
          <span className="font-mono">({conflict.puzzle.slug})</span>
        </li>
      </ul>
      <div className="space-y-2">
        <Label className="text-amber-900 dark:text-amber-200">
          Override the old redirect and use this slug?
        </Label>
        <RadioGroup
          value={overrideConfirmed ? 'yes' : 'no'}
          onValueChange={(value) => onOverrideChange(value === 'yes')}
          className="flex gap-4"
        >
          <Label className="inline-flex cursor-pointer items-center gap-2 font-normal">
            <RadioGroupItem value="no" />
            No
          </Label>
          <Label className="inline-flex cursor-pointer items-center gap-2 font-normal">
            <RadioGroupItem value="yes" />
            Yes
          </Label>
        </RadioGroup>
      </div>
    </div>
  );
};
