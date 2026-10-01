'use client';

import type { ReactNode } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { CrosswordMenuItems, PadavaliMenuItems } from '~/components/app-bar/GameMenuItems';
import type { GameKind } from '~/util/catalog/tags';
import { HubFooter } from './HubFooter';
import { HubHeader } from './HubHeader';

/** Streaming-app chrome: overlay header on home, solid elsewhere, plus a site footer. */
export default function HubShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const overlay = pathname === '/' || pathname.startsWith('/collections');

  return (
    <div className="min-h-dvh bg-[#f3efe6] text-zinc-900 dark:bg-[#0b0d12] dark:text-zinc-50">
      <HubHeader
        overlay={overlay}
        gameMenuItems={
          <>
            <PadavaliMenuItems />
            <CrosswordMenuItems />
          </>
        }
      />
      <main>{children}</main>
      <HubFooter />
    </div>
  );
}

/** Same header/footer on per-game public pages so the site feels like one product. */
export function HubGamePublicShell({
  currentGame,
  showPwaControls = false,
  gameMenuItems,
  extras,
  children
}: {
  currentGame: GameKind;
  showPwaControls?: boolean;
  gameMenuItems?: ReactNode;
  extras?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[#f3efe6] text-zinc-900 dark:bg-[#0b0d12] dark:text-zinc-50">
      <HubHeader
        currentGame={currentGame}
        showPwaControls={showPwaControls}
        gameMenuItems={gameMenuItems}
      />
      <div className="mx-2">{children}</div>
      <HubFooter extras={extras} />
    </div>
  );
}
