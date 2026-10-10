'use client';

import type { ReactNode } from 'react';
import { SimpleGameMenuItems } from '~/components/app-bar/GameMenuItems';
import { HubFooter } from '~/components/hub/HubFooter';
import { HubHeader } from '~/components/hub/HubHeader';
import type { SimpleGameKind } from '~/util/games/kinds';

export function SimpleGameAuthLayout({
  kind,
  children
}: {
  kind: SimpleGameKind;
  children: ReactNode;
}) {
  return (
    <div className="public-canvas flex min-h-dvh flex-col">
      <HubHeader showPwaControls gameMenuItems={<SimpleGameMenuItems kind={kind} />} />
      <div className="mx-2 flex-1">{children}</div>
    </div>
  );
}

export function SimpleGamePublicLayout({
  kind,
  children
}: {
  kind: SimpleGameKind;
  children: ReactNode;
}) {
  return (
    <div className="public-canvas flex min-h-dvh flex-col">
      <HubHeader showPwaControls gameMenuItems={<SimpleGameMenuItems kind={kind} />} />
      <div className="flex-1">{children}</div>
      <HubFooter showPwa showOneSignal />
    </div>
  );
}
