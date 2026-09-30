'use client';

import { useState, type ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { MenuButton } from '~/components/app-bar/AppBarMenu';
import { UserProfileChip } from '~/components/app-bar/UserProfileChip';
import SupportOptions from '~/components/app-bar/SupportOptions';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '~/components/ui/breadcrumb';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '~/components/ui/sidebar';
import { TooltipProvider } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';
import { HubBottomNav, HubSidebar } from './HubSidebar';
import {
  hubPageTitle,
  isCompactGamePath,
  useStoredSidebarOpen,
  writeSidebarOpen
} from './hub_chrome';
import type { HubNavTag, HubScheduledPuzzle } from './hub_data';
import type { ListedCollectionsType } from '~/util/cache.server/collection_cache';

type HubShellProps = {
  children: ReactNode;
  collections: ListedCollectionsType;
  tags: HubNavTag[];
  today?: {
    padavali: HubScheduledPuzzle | null;
    crossword: HubScheduledPuzzle | null;
  };
  profileGame?: 'padavali' | 'crossword';
  showPwaControls?: boolean;
  gameMenuItems?: ReactNode;
};

/** App chrome: persistent sidebar (lg+), slim top utility bar, mobile bottom tabs + sheet. */
export default function HubShell({
  children,
  collections,
  tags,
  today,
  profileGame = 'padavali',
  showPwaControls = false,
  gameMenuItems
}: HubShellProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const compact = isCompactGamePath(pathname);
  const storedOpen = useStoredSidebarOpen();
  const [override, setOverride] = useState<{ path: string; open: boolean } | null>(null);
  const open = override?.path === pathname ? override.open : compact ? false : storedOpen;
  const page = hubPageTitle(pathname, collections);

  return (
    <div className="sm:-mx-2 lg:-mx-3 xl:-mx-4 2xl:-mx-4">
      <TooltipProvider delay={300}>
        <SidebarProvider
          open={open}
          onOpenChange={(next) => {
            setOverride({ path: pathname, open: next });
            writeSidebarOpen(next);
          }}
        >
          <HubSidebar collections={collections} tags={tags} today={today} />
          <SidebarInset>
            <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur-md">
              <SidebarTrigger />
              <Link to="/" className="truncate text-sm font-semibold no-underline lg:hidden">
                Sanskrit Games
              </Link>
              <Breadcrumb className="hidden min-w-0 lg:block">
                <BreadcrumbList>
                  {page.parent ? (
                    <>
                      <BreadcrumbItem>
                        {page.parent === 'Collections' ? (
                          <BreadcrumbLink
                            render={<Link to="/explore" search={{ view: 'collections' }} />}
                          >
                            Collections
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage className="text-muted-foreground">
                            {page.parent}
                          </BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                    </>
                  ) : null}
                  <BreadcrumbItem>
                    <BreadcrumbPage className="truncate font-medium">{page.title}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                <SupportOptions />
                <UserProfileChip game={profileGame} gameLabel="Sanskrit Games" />
                <div className="size-8 shrink-0">
                  <MenuButton showPwaControls={showPwaControls} gameMenuItems={gameMenuItems} />
                </div>
              </div>
            </header>
            <div className={cn('flex min-h-0 flex-1 flex-col', 'pb-20 lg:pb-0')}>{children}</div>
          </SidebarInset>
          <HubBottomNav />
        </SidebarProvider>
      </TooltipProvider>
    </div>
  );
}
