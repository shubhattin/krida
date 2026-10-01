'use client';

import type { ReactNode } from 'react';
import { HubHeader } from './HubHeader';
import type { HubNavData } from './hub_data';

export default function HubShell({
  children,
  nav,
  profileGame = 'padavali',
  showPwaControls = false,
  gameMenuItems
}: {
  children: ReactNode;
  nav: HubNavData;
  profileGame?: 'padavali' | 'crossword';
  showPwaControls?: boolean;
  gameMenuItems?: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <HubHeader
        nav={nav}
        profileGame={profileGame}
        showPwaControls={showPwaControls}
        gameMenuItems={gameMenuItems}
      />
      {children}
    </div>
  );
}
