import type { ReactNode } from 'react';
import type { HubData } from './hub_data';
import { HubHeader } from './HubHeader';

/** Shared chrome for the unified hub pages. */
export default function HubShell({ children, data }: { children: ReactNode; data: HubData }) {
  return (
    <div className="min-h-dvh">
      <HubHeader data={data} />
      <main>{children}</main>
    </div>
  );
}
