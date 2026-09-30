'use client';

import { Image } from '@unpic/react';
import { Link, useRouterState } from '@tanstack/react-router';
import {
  ChevronRight,
  Compass,
  Home,
  LayoutDashboard,
  Library,
  Play,
  Search,
  Tag
} from 'lucide-react';
import { GAME_APP_ICON_SRC } from '~/components/GameAppIcon';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar
} from '~/components/ui/sidebar';
import { useSession } from '~/lib/auth-client';
import { HUB_GAME_LIST, HUB_GAMES, puzzleHref } from './hub_games';
import type { HubNavTag, HubScheduledPuzzle } from './hub_data';
import type { ListedCollectionsType } from '~/util/cache.server/collection_cache';

export function HubSidebar({
  collections,
  tags,
  today
}: {
  collections: ListedCollectionsType;
  tags: HubNavTag[];
  today?: {
    padavali: HubScheduledPuzzle | null;
    crossword: HubScheduledPuzzle | null;
  };
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { setOpenMobile } = useSidebar();
  const { data: session } = useSession();
  const signedIn = !!session?.user;
  const closeMobile = () => setOpenMobile(false);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Sanskrit Games"
              isActive={pathname === '/'}
              render={<Link to="/" onClick={closeMobile} />}
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary font-serif text-base text-primary-foreground">
                स
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-semibold">Sanskrit Games</span>
                <span className="truncate text-xs text-muted-foreground">Play, learn, grow</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Home"
                  isActive={pathname === '/'}
                  render={<Link to="/" onClick={closeMobile} />}
                >
                  <Home />
                  <span>Home</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Explore"
                  isActive={pathname.startsWith('/explore')}
                  render={<Link to="/explore" onClick={closeMobile} />}
                >
                  <Compass />
                  <span>Explore</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Games</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {HUB_GAME_LIST.map((game) => {
                const scheduled = game.kind === 'padavali' ? today?.padavali : today?.crossword;
                const playHref = scheduled ? puzzleHref(game.kind, scheduled.slug) : game.href;

                return (
                  <Collapsible key={game.kind} defaultOpen className="group/collapsible">
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        tooltip={game.name}
                        isActive={pathname === game.href}
                        render={<Link to={game.href} onClick={closeMobile} />}
                      >
                        <Image
                          src={GAME_APP_ICON_SRC[game.icon]}
                          alt=""
                          width={16}
                          height={16}
                          className="size-4"
                        />
                        <span>{game.name}</span>
                      </SidebarMenuButton>
                      <CollapsibleTrigger render={<SidebarMenuAction />}>
                        <ChevronRight className="transition-transform group-data-open/collapsible:rotate-90" />
                        <span className="sr-only">Toggle {game.name}</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              isActive={pathname === game.href || pathname === playHref}
                              render={
                                scheduled ? (
                                  game.kind === 'padavali' ? (
                                    <Link
                                      to="/padavali/$slug"
                                      params={{ slug: scheduled.slug }}
                                      onClick={closeMobile}
                                    />
                                  ) : (
                                    <Link
                                      to="/padajala/$slug"
                                      params={{ slug: scheduled.slug }}
                                      onClick={closeMobile}
                                    />
                                  )
                                ) : (
                                  <Link to={game.href} onClick={closeMobile} />
                                )
                              }
                            >
                              <Play />
                              <span>Play today</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              isActive={pathname.startsWith(game.puzzlesHref)}
                              render={<Link to={game.puzzlesHref} onClick={closeMobile} />}
                            >
                              <Search />
                              <span>Browse puzzles</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {collections.length > 0 ? (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Collections</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {collections.map((collection) => (
                    <SidebarMenuItem key={collection.uid}>
                      <SidebarMenuButton
                        tooltip={collection.title}
                        isActive={pathname === `/collections/${collection.slug}`}
                        render={
                          <Link
                            to="/collections/$slug"
                            params={{ slug: collection.slug }}
                            onClick={closeMobile}
                          />
                        }
                      >
                        <Library />
                        <span>{collection.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : null}

        {tags.length > 0 ? (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Topics</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {tags.map((tag) => (
                    <SidebarMenuItem key={tag.id}>
                      <SidebarMenuButton
                        tooltip={tag.name}
                        render={
                          <Link to="/explore" search={{ tag: tag.slug }} onClick={closeMobile} />
                        }
                      >
                        <Tag />
                        <span>{tag.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : null}

        {signedIn ? (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Dashboard"
                      isActive={pathname === '/dashboard'}
                      render={<Link to="/dashboard" onClick={closeMobile} />}
                    >
                      <LayoutDashboard />
                      <span>Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : null}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

export function HubBottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const tabs = [
    { to: '/' as const, label: 'Home', icon: Home, active: pathname === '/' },
    {
      to: HUB_GAMES.padavali.href,
      label: HUB_GAMES.padavali.name,
      iconSrc: GAME_APP_ICON_SRC.padavali,
      active: pathname === '/padavali' || pathname.startsWith('/padavali/')
    },
    {
      to: HUB_GAMES.crossword.href,
      label: HUB_GAMES.crossword.name,
      iconSrc: GAME_APP_ICON_SRC.padajala,
      active: pathname === '/padajala' || pathname.startsWith('/padajala/')
    },
    {
      to: '/explore' as const,
      label: 'Explore',
      icon: Compass,
      active: pathname.startsWith('/explore')
    }
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid h-14 grid-cols-4">
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className={
              tab.active
                ? 'flex flex-col items-center justify-center gap-0.5 text-xs font-medium text-primary no-underline'
                : 'flex flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground no-underline'
            }
          >
            {'icon' in tab && tab.icon ? <tab.icon className="size-5" /> : null}
            {'iconSrc' in tab && tab.iconSrc ? (
              <Image src={tab.iconSrc} alt="" width={20} height={20} className="size-5" />
            ) : null}
            <span className="truncate px-1">{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
