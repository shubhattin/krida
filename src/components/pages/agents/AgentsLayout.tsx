import { Outlet } from '@tanstack/react-router';
import { AllGamesMenuItems } from '~/components/app-bar/GameMenuItems';
import { HubHeader } from '~/components/hub/HubHeader';
import { AgentsSidebar } from './sidebar/AgentsSidebar';

/** Full-height app shell: site header, chat history, and the open chat. */
export function AgentsLayout() {
  return (
    <div className="flex h-dvh flex-col bg-background">
      <HubHeader gameMenuItems={<AllGamesMenuItems />} />
      <div className="flex min-h-0 flex-1">
        <AgentsSidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
