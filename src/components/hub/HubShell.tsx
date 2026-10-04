import type { ReactNode } from 'react';
import { HubHeader } from './HubHeader';
import { HubFooter } from './HubFooter';

/** Shared chrome for the unified hub pages. */
export default function HubShell({ children }: { children: ReactNode }) {
  return (
    <div className="public-canvas flex min-h-dvh flex-col text-foreground">
      <HubHeader />
      <main className="flex-1">{children}</main>
      <HubFooter />
    </div>
  );
}
