import type { ReactNode } from 'react';
import { HubHeader } from './HubHeader';
import { HubFooter } from './HubFooter';

/** Shared chrome for the unified hub pages. */
export default function HubShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <HubHeader />
      <main className="flex-1">{children}</main>
      <HubFooter />
    </div>
  );
}
