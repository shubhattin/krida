'use client';

import { useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Compass, Route } from 'lucide-react';
import { Image } from '@unpic/react';
import { MenuButton } from '~/components/app-bar/AppBarMenu';
import { UserProfileChip } from '~/components/app-bar/UserProfileChip';
import SupportOptions from '~/components/app-bar/SupportOptions';
import { GameAppIcon, GAME_APP_ICON_SRC } from '~/components/GameAppIcon';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle
} from '~/components/ui/navigation-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '~/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '~/components/ui/accordion';
import { cn } from '~/lib/utils';
import type { HubNavData } from './hub_data';
import { HUB_GAME_LIST, HUB_GAMES } from './hub_games';
import { collectionGames } from './hub_puzzles';
import { HubThumb } from './HubThumb';

const NAV_PATH_LIMIT = 6;
const NAV_TOPIC_LIMIT = 16;

export function HubHeader({
  nav,
  profileGame = 'padavali',
  showPwaControls = false,
  gameMenuItems
}: {
  nav: HubNavData;
  profileGame?: 'padavali' | 'crossword';
  showPwaControls?: boolean;
  gameMenuItems?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2 no-underline">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Route className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm leading-tight font-semibold">
              Sanskrit Games
            </span>
            <span className="hidden text-[11px] text-muted-foreground sm:block">
              Learning paths
            </span>
          </span>
        </Link>

        <div className="hidden min-w-0 flex-1 justify-center lg:flex">
          <DesktopMegaMenu nav={nav} />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div className="lg:hidden">
            <MobileNavSheet nav={nav} />
          </div>
          <SupportOptions />
          <UserProfileChip game={profileGame} gameLabel="Sanskrit Games" />
          <div className="size-8 shrink-0">
            <MenuButton showPwaControls={showPwaControls} gameMenuItems={gameMenuItems} />
          </div>
        </div>
      </div>
    </header>
  );
}

function DesktopMegaMenu({ nav }: { nav: HubNavData }) {
  const paths = nav.collections.slice(0, NAV_PATH_LIMIT);
  const topics = nav.tags.slice(0, NAV_TOPIC_LIMIT);

  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Games</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[36rem] grid-cols-2 gap-2 p-2">
              {HUB_GAME_LIST.map((game) => (
                <li key={game.kind}>
                  <GameMenuCard game={game} />
                </li>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger>Paths</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="flex w-[28rem] flex-col gap-1 p-2">
              {paths.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">No paths listed yet.</p>
              ) : (
                paths.map((collection) => (
                  <PathMenuRow key={collection.uid} collection={collection} />
                ))
              )}
              <NavigationMenuLink
                closeOnClick
                render={<Link to="/explore" search={{ view: 'collections' }} />}
                className="mt-1 justify-center font-medium"
              >
                All paths
              </NavigationMenuLink>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger>Topics</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="flex w-[26rem] flex-col gap-3 p-3">
              {topics.length === 0 ? (
                <p className="text-sm text-muted-foreground">No topics yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {topics.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      render={<Link to="/explore" search={{ tag: tag.slug }} />}
                    >
                      {tag.name}
                      <span className="text-muted-foreground">{tag.count}</span>
                    </Badge>
                  ))}
                </div>
              )}
              <NavigationMenuLink
                closeOnClick
                render={<Link to="/explore" />}
                className="justify-center font-medium"
              >
                All topics
              </NavigationMenuLink>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuLink
            className={navigationMenuTriggerStyle()}
            render={<Link to="/explore" />}
          >
            Explore
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function GameMenuCard({ game }: { game: (typeof HUB_GAME_LIST)[number] }) {
  return (
    <div className="flex h-full flex-col gap-2 rounded-lg p-3 hover:bg-muted">
      <div className="flex items-start gap-3">
        <GameAppIcon game={game.icon} name={game.name} size="sm" />
        <div className="min-w-0">
          <p className="font-semibold">{game.name}</p>
          <p className="text-xs text-muted-foreground">{game.subtitle}</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{game.description}</p>
      <div className="mt-auto flex gap-2">
        <NavigationMenuLink
          closeOnClick
          render={<Link to={game.href} />}
          className="flex-1 justify-center bg-primary text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground"
        >
          Play today
        </NavigationMenuLink>
        <NavigationMenuLink
          closeOnClick
          render={<Link to="/explore" search={{ game: game.kind }} />}
          className="flex-1 justify-center"
        >
          Browse
        </NavigationMenuLink>
      </div>
    </div>
  );
}

function PathMenuRow({ collection }: { collection: HubNavData['collections'][number] }) {
  const games = collectionGames(collection);
  const stepCount = collection.items.length;

  return (
    <NavigationMenuLink
      closeOnClick
      render={<Link to="/collections/$slug" params={{ slug: collection.slug }} />}
      className="items-start gap-3"
    >
      <span className="block size-12 shrink-0 overflow-hidden rounded-md bg-muted">
        <HubThumb image={collection.image} alt="" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{collection.title}</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {stepCount} {stepCount === 1 ? 'step' : 'steps'}
          {games.map((kind) => (
            <Image
              key={kind}
              src={GAME_APP_ICON_SRC[HUB_GAMES[kind].icon]}
              alt={HUB_GAMES[kind].name}
              width={14}
              height={14}
              className="size-3.5"
            />
          ))}
        </span>
      </span>
    </NavigationMenuLink>
  );
}

function MobileNavSheet({ nav }: { nav: HubNavData }) {
  const [open, setOpen] = useState(false);
  const paths = nav.collections.slice(0, NAV_PATH_LIMIT);
  const topics = nav.tags.slice(0, NAV_TOPIC_LIMIT);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="outline" size="sm" aria-label="Browse games, paths, and topics" />}
      >
        <Compass data-icon="inline-start" />
        Browse
      </SheetTrigger>
      <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Browse</SheetTitle>
          <SheetDescription>Games, learning paths, and topics</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2 px-4 pb-6">
          <Button
            variant="ghost"
            nativeButton={false}
            className="justify-start"
            render={<Link to="/explore" />}
            onClick={() => setOpen(false)}
          >
            Explore
          </Button>
          <Accordion multiple>
            <AccordionItem value="games">
              <AccordionTrigger>Games</AccordionTrigger>
              <AccordionContent className="[&_a]:no-underline">
                <div className="flex flex-col gap-3">
                  {HUB_GAME_LIST.map((game) => (
                    <div key={game.kind} className="flex flex-col gap-2 rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <GameAppIcon game={game.icon} name={game.name} size="sm" />
                        <div>
                          <p className="font-medium">{game.name}</p>
                          <p className="text-xs text-muted-foreground">{game.subtitle}</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{game.description}</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          nativeButton={false}
                          render={<Link to={game.href} />}
                          onClick={() => setOpen(false)}
                        >
                          Play today
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          nativeButton={false}
                          render={<Link to="/explore" search={{ game: game.kind }} />}
                          onClick={() => setOpen(false)}
                        >
                          Browse
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="paths">
              <AccordionTrigger>Paths</AccordionTrigger>
              <AccordionContent className="[&_a]:no-underline">
                <div className="flex flex-col gap-1">
                  {paths.map((collection) => (
                    <Link
                      key={collection.uid}
                      to="/collections/$slug"
                      params={{ slug: collection.slug }}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-lg p-2 no-underline hover:bg-muted"
                    >
                      <span className="block size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                        <HubThumb image={collection.image} alt="" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {collection.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {collection.items.length} steps
                        </span>
                      </span>
                    </Link>
                  ))}
                  <Button
                    variant="ghost"
                    nativeButton={false}
                    className="justify-start"
                    render={<Link to="/explore" search={{ view: 'collections' }} />}
                    onClick={() => setOpen(false)}
                  >
                    All paths
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="topics">
              <AccordionTrigger>Topics</AccordionTrigger>
              <AccordionContent className="[&_a]:no-underline">
                <div className="flex flex-wrap gap-2">
                  {topics.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      render={
                        <Link
                          to="/explore"
                          search={{ tag: tag.slug }}
                          onClick={() => setOpen(false)}
                        />
                      }
                    >
                      {tag.name}
                      <span className="text-muted-foreground">{tag.count}</span>
                    </Badge>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  className="mt-2 justify-start"
                  nativeButton={false}
                  render={<Link to="/explore" />}
                  onClick={() => setOpen(false)}
                >
                  All topics
                </Button>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function HubPageFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main className={cn('mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8', className)}>
      {children}
    </main>
  );
}
