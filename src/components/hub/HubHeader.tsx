'use client';

import { useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Book, Compass, LayoutDashboard, Menu, Music, Newspaper } from 'lucide-react';
import { BsVectorPen } from 'react-icons/bs';
import { FaInstagram, FaYoutube } from 'react-icons/fa';
import { SiGithub } from 'react-icons/si';
import { MenuButton } from '~/components/app-bar/AppBarMenu';
import SupportOptions from '~/components/app-bar/SupportOptions';
import { UserProfileChip } from '~/components/app-bar/UserProfileChip';
import { GameAppIcon } from '~/components/GameAppIcon';
import { Separator } from '~/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '~/components/ui/sheet';
import { Button } from '~/components/ui/button';
import { useSession } from '~/lib/auth-client';
import { cn } from '~/lib/utils';
import { HUB_GAME_LIST, type HubGameMeta } from './hub_games';
import { hubNavData$, type HubNavData } from './hub_nav_data';

const EXTERNAL_LINKS = [
  {
    href: 'http://www.thesanskritchannel.org/',
    title: 'The Sanskrit Channel',
    subtitle: 'Main site',
    icon: Book,
    tone: 'from-emerald-500 to-teal-600'
  },
  {
    href: 'https://svara.thesanskritchannel.org/',
    title: 'Svara Darshini',
    subtitle: 'Principles of music',
    icon: Music,
    tone: 'from-indigo-500 to-violet-600'
  },
  {
    href: 'https://akshara.thesanskritchannel.org/',
    title: 'Akshara Shikshaka',
    subtitle: 'Learn to write scripts',
    icon: BsVectorPen,
    tone: 'from-orange-400 to-orange-600'
  }
] as const;

type HubHeaderProps = {
  initialNav?: HubNavData;
  currentGame?: HubGameMeta;
  gameMenuItems?: ReactNode;
  showPwaControls?: boolean;
};

export function HubWordmark({
  currentGame,
  className
}: {
  currentGame?: HubGameMeta;
  className?: string;
}) {
  return (
    <Link
      to="/"
      className={cn('flex flex-col items-center no-underline', className)}
      aria-label="Sanskrit Games home"
    >
      <span className="font-serif text-[1.05rem] leading-none font-semibold tracking-tight text-foreground sm:text-lg">
        Sanskrit <span className="font-normal italic">Games</span>
      </span>
      {currentGame ? (
        <span className="mt-0.5 text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
          {currentGame.name}
        </span>
      ) : null}
    </Link>
  );
}

export default function HubHeader({
  initialNav,
  currentGame,
  gameMenuItems,
  showPwaControls = false
}: HubHeaderProps) {
  const profileGame = currentGame?.kind ?? 'padavali';
  const profileLabel = currentGame?.name ?? 'Sanskrit Games';

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto grid h-16 max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:px-4">
        <div className="flex items-center">
          <HubNavDrawer initialNav={initialNav} />
        </div>
        <HubWordmark currentGame={currentGame} />
        <div className="flex items-center justify-end gap-1 sm:gap-1.5">
          <SupportOptions compact />
          <UserProfileChip game={profileGame} gameLabel={profileLabel} />
          <div className="size-8 shrink-0">
            <MenuButton showPwaControls={showPwaControls} gameMenuItems={gameMenuItems} />
          </div>
        </div>
      </div>
    </header>
  );
}

function HubNavDrawer({ initialNav }: { initialNav?: HubNavData }) {
  const [open, setOpen] = useState(false);
  const [fetchedNav, setFetchedNav] = useState<HubNavData | undefined>();
  const nav = initialNav ?? fetchedNav;
  const { data: session } = useSession();
  const signedIn = !!session?.user;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && !nav) {
      void hubNavData$().then(setFetchedNav);
    }
  };

  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" aria-label="Open menu" className="-ml-1" />}
      >
        <Menu />
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(100%,22rem)] gap-0 p-0 sm:max-w-sm">
        <SheetHeader className="border-b border-border/70 px-5 py-5">
          <SheetTitle className="font-serif text-xl font-semibold tracking-tight">
            Sanskrit <span className="font-normal italic">Games</span>
          </SheetTitle>
          <SheetDescription>Today&apos;s puzzles, collections, and games.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <nav className="flex flex-col gap-6 px-4 py-5">
            <DrawerSection label="Today">
              <Link
                to="/"
                onClick={close}
                className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm no-underline hover:bg-muted"
              >
                <Newspaper className="size-4 text-muted-foreground" />
                <span className="font-medium">Today&apos;s edition</span>
              </Link>
              <Link
                to="/explore"
                onClick={close}
                className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm no-underline hover:bg-muted"
              >
                <Compass className="size-4 text-muted-foreground" />
                <span className="font-medium">Explore</span>
              </Link>
              {signedIn ? (
                <Link
                  to="/dashboard"
                  onClick={close}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm no-underline hover:bg-muted"
                >
                  <LayoutDashboard className="size-4 text-muted-foreground" />
                  <span className="font-medium">Dashboard</span>
                </Link>
              ) : null}
            </DrawerSection>

            <DrawerSection label="Games">
              {HUB_GAME_LIST.map((game) => (
                <div key={game.kind} className="rounded-xl px-2 py-2">
                  <Link
                    to={game.href}
                    onClick={close}
                    className="flex items-center gap-3 no-underline"
                  >
                    <GameAppIcon game={game.icon} name={game.name} size="sm" />
                    <div className="min-w-0">
                      <p className="font-serif text-base leading-tight font-semibold">
                        {game.name}
                      </p>
                      <p className="text-xs tracking-wide text-muted-foreground uppercase">
                        {game.subtitle}
                      </p>
                    </div>
                  </Link>
                  <div className="mt-2 ml-14 flex gap-3 text-xs">
                    <Link
                      to={game.href}
                      onClick={close}
                      className="text-muted-foreground no-underline hover:text-foreground"
                    >
                      Play today
                    </Link>
                    <Link
                      to={game.puzzlesHref}
                      onClick={close}
                      className="text-muted-foreground no-underline hover:text-foreground"
                    >
                      Puzzles
                    </Link>
                  </div>
                </div>
              ))}
            </DrawerSection>

            {nav && nav.collections.length > 0 ? (
              <DrawerSection label="Collections">
                {nav.collections.map((collection) => (
                  <Link
                    key={collection.slug}
                    to="/collections/$slug"
                    params={{ slug: collection.slug }}
                    onClick={close}
                    className="rounded-lg px-2 py-1.5 text-sm no-underline hover:bg-muted"
                  >
                    {collection.title}
                  </Link>
                ))}
              </DrawerSection>
            ) : null}

            {nav && nav.tags.length > 0 ? (
              <DrawerSection label="Topics">
                <div className="flex flex-wrap gap-1.5 px-1">
                  {nav.tags.map((tag) => (
                    <Link
                      key={tag.slug}
                      to="/explore"
                      search={{ tag: tag.slug }}
                      onClick={close}
                      className="rounded-full border border-border/80 px-2.5 py-0.5 text-xs no-underline hover:border-foreground/30 hover:bg-muted"
                    >
                      {tag.name}
                    </Link>
                  ))}
                </div>
              </DrawerSection>
            ) : null}

            <Separator />

            <DrawerSection label="Elsewhere">
              <div className="flex gap-2 px-1">
                <ExternalIconLink
                  href="https://github.com/shubhattin/padavali/"
                  label="GitHub"
                  onClick={close}
                >
                  <SiGithub className="size-4" />
                </ExternalIconLink>
                <ExternalIconLink
                  href="https://www.youtube.com/@TheSanskritChannel"
                  label="YouTube"
                  onClick={close}
                >
                  <FaYoutube className="size-4" />
                </ExternalIconLink>
                <ExternalIconLink
                  href="https://www.instagram.com/thesanskritchannel/"
                  label="Instagram"
                  onClick={close}
                >
                  <FaInstagram className="size-4" />
                </ExternalIconLink>
              </div>
              {EXTERNAL_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={close}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 no-underline hover:bg-muted"
                >
                  <span
                    className={cn(
                      'flex size-8 items-center justify-center rounded-lg bg-linear-to-br text-white',
                      link.tone
                    )}
                  >
                    <link.icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{link.title}</span>
                    <span className="block text-xs text-muted-foreground">{link.subtitle}</span>
                  </span>
                </a>
              ))}
              <a
                href="https://lipilekhika.in"
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                className="flex items-center gap-3 rounded-lg px-2 py-2 no-underline hover:bg-muted"
              >
                <span
                  className="size-8 shrink-0 bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: "url('/lipi.svg')" }}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">Lipi Lekhika</span>
                  <span className="block text-xs text-muted-foreground">Type Indian languages</span>
                </span>
              </a>
            </DrawerSection>
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DrawerSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-2 text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </p>
      {children}
    </div>
  );
}

function ExternalIconLink({
  href,
  label,
  onClick,
  children
}: {
  href: string;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-lg border border-border/80 text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {children}
    </a>
  );
}
